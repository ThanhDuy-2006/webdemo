import { connectDB } from "../src/utils/db.js";
import fs from 'fs';

async function debug() {
    try {
        const pool = await connectDB();
        
        const [txs] = await pool.execute(`
            SELECT t.id, t.user_id, t.type, t.total_price, t.description, p.seller_id 
            FROM transactions t
            LEFT JOIN products p ON p.id = t.product_id
            ORDER BY t.id DESC LIMIT 20
        `);

        const [records] = await pool.execute(`
            SELECT id, user_id, amount, type, note, source_type, source_id
            FROM financial_records 
            ORDER BY id DESC LIMIT 20
        `);

        const result = {
            transactions: txs,
            financial_records: records
        };

        fs.writeFileSync('debug_output.json', JSON.stringify(result, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debug();
