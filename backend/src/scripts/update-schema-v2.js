
import { sql, connectDB } from "../utils/db.js";
import dotenv from "dotenv";
dotenv.config();

async function run() {
    try {
        const pool = await connectDB();
        
        // Add related_user_id column
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'wallet_transactions' AND COLUMN_NAME = 'related_user_id')
                BEGIN
                    ALTER TABLE wallet_transactions ADD related_user_id INT;
                    PRINT 'Column related_user_id added.';
                END
                ELSE
                BEGIN
                    PRINT 'Column related_user_id already exists.';
                END
            `);
        } catch (e) {
            console.error("Schema update error:", e.message);
        }

        console.log("✅ Schema updated successfully");
        process.exit(0);
    } catch (e) {
        console.error("❌ Error:", e);
        process.exit(1);
    }
}

run();
