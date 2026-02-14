import dotenv from "dotenv";
dotenv.config();
import { connectDB } from "../utils/db.js";

const initDepositDb = async () => {
    try {
        console.log("🚀 Initializing Deposit Request Tables...");
        const pool = await connectDB();

        // 1. Create deposit_requests table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS deposit_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                method ENUM('BANK_TRANSFER', 'MOMO', 'CASH') NOT NULL,
                proof_image VARCHAR(255),
                status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
                admin_note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_at TIMESTAMP NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_status (status),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ Table 'deposit_requests' created/verified.");

        // 2. Update wallet_transactions
        try {
            await pool.query(`ALTER TABLE wallet_transactions ADD COLUMN deposit_request_id INT NULL`);
            console.log("✅ Column 'deposit_request_id' added.");
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') {
                console.log("ℹ️ Column 'deposit_request_id' already exists.");
            } else {
                throw e;
            }
        }

        try {
            await pool.query(`
                ALTER TABLE wallet_transactions 
                ADD CONSTRAINT fk_deposit_request FOREIGN KEY (deposit_request_id) REFERENCES deposit_requests(id) ON DELETE SET NULL
            `);
            console.log("✅ Foreign key constraint added.");
        } catch (e) {
            if (e.code === 'ER_FK_DUP_NAME' || e.code === 'ER_DUP_KEY') {
                console.log("ℹ️ Foreign key constraint already exists.");
            } else {
                console.warn("⚠️ FK Warning (might be fine):", e.message);
            }
        }

        console.log("✨ Deposit system database initialization completed!");
        process.exit(0);
    } catch (e) {
        console.error("❌ Initialization failed:");
        console.error(e);
        process.exit(1);
    }
};

initDepositDb();
