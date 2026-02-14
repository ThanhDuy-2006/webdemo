
import { connectDB, sql } from "../src/utils/db.js";

async function run() {
    try {
        const pool = await connectDB();
        console.log("Checking stock_requests schema...");
        
        // Check if column exists
        const check = await pool.request().query(`
            SELECT * FROM sys.columns 
            WHERE Name = N'product_id' AND Object_ID = Object_ID(N'stock_requests')
        `);

        if (check.recordset.length === 0) {
            console.log("Adding product_id column...");
            await pool.request().query(`ALTER TABLE stock_requests ADD product_id INT`);
            console.log("✅ Column added.");
        } else {
            console.log("ℹ Column already exists.");
        }
        
        process.exit(0);
    } catch (e) {
        console.error("❌ Migration failed:", e);
        process.exit(1);
    }
}

run();
