import { connectDB } from "../src/utils/db.js";

async function runSync() {
    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        console.log("Starting forced sync from Excel to User Inventory...");

        // 1. Get all checked items
        const [rows] = await connection.execute(`
            SELECT es.user_id, i.product_id, i.name as item_name
            FROM house_excel_status es
            JOIN house_excel_items i ON i.id = es.item_id
            WHERE es.is_checked = 1 AND i.product_id IS NOT NULL
        `);

        console.log(`Found ${rows.length} checked items to sync.`);

        for (const row of rows) {
            const { user_id, product_id, item_name } = row;
            
            // Check if already in inventory
            const [inv] = await connection.execute(
                `SELECT id FROM user_inventories WHERE user_id = ? AND product_id = ?`,
                [user_id, product_id]
            );

            if (inv.length === 0) {
                console.log(`Adding ${item_name} (PID: ${product_id}) to User ${user_id} inventory...`);
                await connection.execute(
                    `INSERT INTO user_inventories (user_id, product_id, quantity, is_selling) VALUES (?, ?, 1, 0)`,
                    [user_id, product_id]
                );
            }
        }

        console.log("Sync completed successfully!");
        process.exit(0);
    } catch (e) {
        console.error("Sync failed:", e);
        process.exit(1);
    } finally {
        if (connection) connection.release();
    }
}

runSync();
