import dotenv from "dotenv";
dotenv.config();
import { connectDB } from "../utils/db.js";

const resetDb = async () => {
  try {
    console.log("Starting Database Reset...");
    const pool = await connectDB();

    // 1. Get all table names
    const [tables] = await pool.query("SHOW TABLES");
    const tableNames = tables.map(t => Object.values(t)[0]);

    console.log(`Found tables: ${tableNames.join(", ")}`);

    // 2. Disable foreign key checks for truncation
    await pool.query("SET FOREIGN_KEY_CHECKS = 0");

    // 3. Truncate all tables except 'users'
    for (const table of tableNames) {
      if (table !== 'users') {
        console.log(`Clearing table: ${table}`);
        await pool.query(`TRUNCATE TABLE \`${table}\``);
      }
    }

    // 4. Special handling for 'users' - delete non-admins
    // Note: Based on DB structure, admin users have role = 'admin'
    console.log("Clearing non-admin users...");
    await pool.query("DELETE FROM users WHERE role != 'admin' OR role IS NULL");
    
    // 5. Re-enable foreign key checks
    await pool.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("✅ Database reset successfully! Only Admin users remain.");
    process.exit(0);
  } catch (e) {
    console.error("❌ Database reset failed:", e);
    process.exit(1);
  }
};

resetDb();
