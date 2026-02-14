import { connectDB } from "../src/utils/db.js";

async function migrate() {
    try {
        const pool = await connectDB();
        console.log("Adding price and quantity to house_excel_items...");
        
        await pool.execute(`
            ALTER TABLE house_excel_items 
            ADD COLUMN price DECIMAL(15, 2) DEFAULT 0,
            ADD COLUMN quantity INT DEFAULT 1;
        `);
        
        console.log("Migration successful!");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e.message);
        process.exit(1);
    }
}

migrate();
