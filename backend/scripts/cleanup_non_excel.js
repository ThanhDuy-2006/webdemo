import { connectDB } from '../src/utils/db.js';

async function cleanup() {
    const pool = await connectDB();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [housesToDelete] = await connection.execute('SELECT id FROM houses WHERE type != "excel"');
        const ids = housesToDelete.map(h => h.id);

        if (ids.length > 0) {
            console.log(`Found ${ids.length} houses to delete:`, ids);
            const placeholders = ids.map(() => '?').join(',');

            await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

            const tablesToClean = [
                'financial_records', 'transactions', 'house_excel_status', 
                'house_excel_items', 'user_houses', 'products', 'budgets', 'notifications'
            ];

            for (const table of tablesToClean) {
                try {
                    await connection.execute(`DELETE FROM ${table} WHERE house_id IN (${placeholders})`, ids);
                } catch (err) {
                    // console.log(`Skipping ${table}: ${err.message}`);
                }
            }

            // Cleanup sub-child tables
            try {
                await connection.execute(`DELETE FROM user_inventories WHERE product_id IN (SELECT id FROM products WHERE house_id IN (${placeholders}))`, ids);
                await connection.execute(`DELETE FROM product_sales_log WHERE product_id IN (SELECT id FROM products WHERE house_id IN (${placeholders}))`, ids);
                await connection.execute(`DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE house_id IN (${placeholders}))`, ids);
            } catch (err) {}

            await connection.execute(`DELETE FROM houses WHERE id IN (${placeholders})`, ids);

            await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
            
            console.log('Database cleanup completed successfully.');
        } else {
            console.log('No non-excel houses found.');
        }

        await connection.commit();
    } catch (e) {
        if (connection) await connection.rollback();
        console.error('Cleanup failed:', e);
    } finally {
        if (connection) connection.release();
        process.exit(0);
    }
}

cleanup();
