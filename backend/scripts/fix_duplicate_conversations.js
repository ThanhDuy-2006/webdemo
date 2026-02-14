import { connectDB } from '../src/utils/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function fixDuplicateConversations() {
    console.log("Starting duplicate conversation cleanup...");
    const pool = await connectDB();
    
    try {
        // 1. Fetch all conversations
        const [rows] = await pool.execute(`SELECT * FROM conversations`);
        console.log(`Found ${rows.length} total conversations.`);

        const groups = {};

        // 2. Group by unique key (house_id, min_user, max_user)
        for (const conv of rows) {
            const u1 = Number(conv.user1_id);
            const u2 = Number(conv.user2_id);
            const minU = Math.min(u1, u2);
            const maxU = Math.max(u1, u2);
            const key = `${conv.house_id}-${minU}-${maxU}`;

            if (!groups[key]) groups[key] = [];
            groups[key].push(conv);
        }

        // 3. Process duplicates
        let deletedCount = 0;
        let mergedCount = 0;

        for (const key in groups) {
            const convs = groups[key];
            if (convs.length > 1) {
                console.log(`Found ${convs.length} duplicates for key ${key}`);
                
                // Sort by ID descending (keep newest? Or maybe keep the one with most messages?)
                // Strategy: Keep the first one created (lowest ID) usually safer, or the one with most messages.
                // Let's count messages for each.
                
                const convsWithCounts = [];
                for (const c of convs) {
                    const [res] = await pool.execute(`SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?`, [c.id]);
                    convsWithCounts.push({ ...c, msgCount: res[0].count });
                }

                // Sort: Primary by msgCount (desc), Secondary by ID (asc)
                convsWithCounts.sort((a, b) => {
                    if (b.msgCount !== a.msgCount) return b.msgCount - a.msgCount;
                    return a.id - b.id;
                });

                const keeper = convsWithCounts[0];
                const toDelete = convsWithCounts.slice(1);

                console.log(`Keeping conversation ${keeper.id} (${keeper.msgCount} msgs). Merging ${toDelete.length} others.`);

                for (const remove of toDelete) {
                    // Move messages
                    await pool.execute(`UPDATE messages SET conversation_id = ? WHERE conversation_id = ?`, [keeper.id, remove.id]);
                    // Delete conversation
                    await pool.execute(`DELETE FROM conversations WHERE id = ?`, [remove.id]);
                    deletedCount++;
                }
                mergedCount++;
                
                // Fix user order in keeper if needed (though constraint check usually handles this, let's just ensure it's min-max)
                 const u1 = Number(keeper.user1_id);
                 const u2 = Number(keeper.user2_id);
                 if (u1 > u2) {
                     await pool.execute(`UPDATE conversations SET user1_id = ?, user2_id = ? WHERE id = ?`, [u2, u1, keeper.id]);
                     console.log(`Corrected user order for conversation ${keeper.id}`);
                 }
            } else {
                 // Even if unique, check order
                 const c = convs[0];
                 const u1 = Number(c.user1_id);
                 const u2 = Number(c.user2_id);
                 if (u1 > u2) {
                     await pool.execute(`UPDATE conversations SET user1_id = ?, user2_id = ? WHERE id = ?`, [u2, u1, c.id]);
                     console.log(`Corrected user order for conversation ${c.id}`);
                 }
            }
        }

        console.log(`Cleanup complete. Merged ${mergedCount} groups. Deleted ${deletedCount} conversation records.`);
        process.exit(0);

    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

fixDuplicateConversations();
