import { connectDB } from "../src/utils/db.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  console.log("🚀 Running Messaging Migration...");
  try {
    const pool = await connectDB();
    const sqlPath = path.join(__dirname, '../migrations/001_create_messaging_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon to execute multiple statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      await pool.query(statement);
      console.log("✅ Executed statement.");
    }

    console.log("🎉 Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration Failed:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
