
import { sql, connectDB } from "../src/utils/db.js";

async function migrate() {
  try {
    const pool = await connectDB();
    console.log("Connected to MSSQL...");

    // Check if column exists
    const check = await pool.request().query(`
      SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'houses' AND COLUMN_NAME = 'cover_position'
    `);

    if (check.recordset.length === 0) {
      console.log("Adding cover_position column...");
      await pool.request().query(`
        ALTER TABLE houses
        ADD cover_position NVARCHAR(50) DEFAULT 'center'
      `);
      console.log("Column added.");
    } else {
      console.log("Column cover_position already exists.");
    }

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
