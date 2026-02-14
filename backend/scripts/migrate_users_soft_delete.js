import { connectDB } from "../src/utils/db.js";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  try {
    const pool = await connectDB();
    console.log("Checking users table for deleted_at column...");
    
    // Check if column exists
    const [rows] = await pool.query("SHOW COLUMNS FROM users LIKE 'deleted_at'");
    
    if (rows.length === 0) {
        console.log("Adding deleted_at column...");
        await pool.query("ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL");
        console.log("✅ Column added successfully.");
    } else {
        console.log("ℹ️ Column already exists.");
    }

  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

run();
