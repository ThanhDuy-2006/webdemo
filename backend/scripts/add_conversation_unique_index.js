import { connectDB } from '../src/utils/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function addUniqueConstraint() {
    console.log("Adding UNIQUE constraint to conversations...");
    const pool = await connectDB();
    
    try {
        // Try adding the constraint
        await pool.execute(`
            ALTER TABLE conversations
            ADD CONSTRAINT unique_house_users UNIQUE (house_id, user1_id, user2_id);
        `);
        console.log("✅ UNIQUE constraint added successfully.");
        process.exit(0);
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
             console.error("❌ Failed: Duplicates still exist.");
        } else if (e.code === 'ER_DUP_KEYNAME') {
             console.log("⚠️ Constraint already exists.");
        } else {
             console.error("Error:", e);
        }
        process.exit(1);
    }
}

addUniqueConstraint();
