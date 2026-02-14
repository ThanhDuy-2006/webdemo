import { connectDB } from "../src/utils/db.js";
import dotenv from "dotenv";
dotenv.config();

const runMigrationV2 = async () => {
    try {
        console.log("🔌 Connecting to database...");
        const pool = await connectDB();
        const connection = await pool.getConnection();
        console.log("✅ Connected. Starting V2 migration...");

        // 1. Add deleted_at to financial_records
        try {
            await connection.query(`
                ALTER TABLE financial_records
                ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
            `);
            console.log("✅ Added 'deleted_at' column to 'financial_records'.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ Column 'deleted_at' already exists.");
            } else {
                throw e;
            }
        }

        // 2. Create expense_logs table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS expense_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                record_id INT NOT NULL,
                user_id INT NOT NULL,
                action VARCHAR(50) NOT NULL, -- 'UPDATE_CATEGORY', 'SOFT_DELETE', 'RESTORE'
                old_value TEXT,
                new_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (record_id) REFERENCES financial_records(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ Table 'expense_logs' checked/created.");

        connection.release();
        console.log("🎉 Migration V2 completed successfully.");
        process.exit(0);

    } catch (e) {
        console.error("❌ Migration V2 failed:", e);
        process.exit(1);
    }
};

runMigrationV2();
