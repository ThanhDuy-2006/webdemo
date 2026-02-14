
import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME || "MarketplaceDB",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function migrate() {
  try {
    console.log("🚀 Starting migration...");
    const pool = await sql.connect(config);

    // Check if column exists
    const result = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM sys.columns 
      WHERE object_id = OBJECT_ID('houses') 
      AND name = 'cover_image'
    `);

    if (result.recordset[0].count === 0) {
      console.log("⚠️ Column 'cover_image' does not exist. Adding...");
      await pool.request().query(`
        ALTER TABLE houses
        ADD cover_image NVARCHAR(MAX)
      `);
      console.log("✅ Column 'cover_image' added successfully.");
    } else {
      console.log("ℹ️ Column 'cover_image' already exists.");
    }

    await pool.close();
    console.log("✅ Migration complete.");
  } catch (err) {
    console.error("❌ Migration Failed:", err);
  }
}

migrate();
