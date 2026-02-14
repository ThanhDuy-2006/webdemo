import { connectDB } from "../src/utils/db.js";

async function debug() {
    try {
        const pool = await connectDB();
        
        console.log("--- LATEST TRANSACTIONS ---");
        const [txs] = await pool.execute(`
            SELECT t.id, t.user_id, t.type, t.total_price, t.description, p.seller_id 
            FROM transactions t
            LEFT JOIN products p ON p.id = t.product_id
            ORDER BY t.id DESC LIMIT 10
        `);
        console.table(txs);

        console.log("\n--- LATEST FINANCIAL RECORDS ---");
        const [records] = await pool.execute(`
            SELECT id, user_id, amount, type, note, source_type, source_id, created_at
            FROM financial_records 
            ORDER BY id DESC LIMIT 10
        `);
        console.table(records);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debug();
