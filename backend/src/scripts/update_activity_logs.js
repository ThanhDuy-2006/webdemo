import dotenv from "dotenv";
dotenv.config();
import { connectDB } from "../utils/db.js";
import logger from "../utils/logger.js";

const updateActivityLogsTable = async () => {
  try {
    logger.info("🚀 Updating user_activity_logs table for Peak Hour Analytics...");
    const pool = await connectDB();

    // 1. Rename or Recreate table to match specific requirement: visited_at (datetime)
    // The user wants: id (PK), user_id (FK), visited_at (datetime)
    
    // We'll check if table exists and rename column or recreate
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activity_logs_new (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_visited_at (visited_at),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migrate existing data if any (from created_at to visited_at)
    const [tables] = await pool.query("SHOW TABLES LIKE 'user_activity_logs'");
    if (tables.length > 0) {
        logger.info("Migrating data from old table...");
        await pool.query(`
            INSERT IGNORE INTO user_activity_logs_new (user_id, visited_at)
            SELECT user_id, created_at FROM user_activity_logs
        `);
        // Drop old table
        await pool.query("DROP TABLE user_activity_logs");
    }

    // Rename new table to original name
    await pool.query("RENAME TABLE user_activity_logs_new TO user_activity_logs");

    logger.info("✅ Table 'user_activity_logs' updated successfully with visited_at column.");
    process.exit(0);
  } catch (e) {
    logger.error("❌ Database update failed:", e);
    process.exit(1);
  }
};

updateActivityLogsTable();
