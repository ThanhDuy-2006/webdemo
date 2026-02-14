
import { sql, connectDB } from "../utils/db.js";
import dotenv from "dotenv";
dotenv.config();

async function run() {
    try {
        const pool = await connectDB();
        
        // Add avatar_url column
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url')
                BEGIN
                    ALTER TABLE users ADD avatar_url NVARCHAR(MAX);
                    PRINT 'Column avatar_url added.';
                END
                ELSE
                BEGIN
                    PRINT 'Column avatar_url already exists.';
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
