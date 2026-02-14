import { connectDB } from "../src/utils/db.js";
import fs from 'fs';

async function debug() {
    try {
        const pool = await connectDB();
        
        console.log("Checking user_inventories...");
        const [inv] = await pool.execute(`
            SELECT ui.*, p.name as product_name, u.full_name as user_name
            FROM user_inventories ui
            JOIN products p ON p.id = ui.product_id
            JOIN users u ON u.id = ui.user_id
            ORDER BY ui.id DESC LIMIT 20
        `);

        console.log("Checking Excel status...");
        const [status] = await pool.execute(`
            SELECT es.*, i.name as item_name, u.full_name as user_name
            FROM house_excel_status es
            JOIN house_excel_items i ON i.id = es.item_id
            JOIN users u ON u.id = es.user_id
            WHERE es.is_checked = 1
            ORDER BY es.id DESC LIMIT 20
        `);

        const result = {
            inventories: inv,
            excel_status: status
        };

        fs.writeFileSync('debug_inventory.json', JSON.stringify(result, null, 2));
        console.log("Debug data written to debug_inventory.json");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debug();
