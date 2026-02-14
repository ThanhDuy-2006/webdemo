import dotenv from "dotenv";
dotenv.config();
import { connectDB } from "../utils/db.js";

const initActivityDb = async () => {
  try {
    console.log("🚀 Initializing User Activity Tables...");
    const pool = await connectDB();

    // 1. Create user_activity_logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activity_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          ip_address VARCHAR(45),
          user_agent TEXT,
          route VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Table 'user_activity_logs' created/verified.");

    // 2. Create user_activity_summary
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activity_summary (
          user_id INT PRIMARY KEY,
          total_visits INT DEFAULT 0,
          last_visit_at TIMESTAMP NULL,
          total_active_days INT DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Table 'user_activity_summary' created/verified.");

    console.log("✨ User Activity database initialization completed!");
    process.exit(0);
  } catch (e) {
    console.error("❌ Initialization failed:", e);
    process.exit(1);
  }
};

initActivityDb();
