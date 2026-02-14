import { connectDB } from "../../utils/db.js";
import { deleteLocalFile } from "../../utils/fileHelper.js";

const CLEANUP_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours
const RETENTION_DAYS = 14;

export const startTrashCleanupScheduler = () => {
    console.log("🕒 Trash Cleanup Scheduler started (Interval: 12h)");
    
    // Run once on startup
    performCleanup();

    // Schedule subsequent runs
    setInterval(performCleanup, CLEANUP_INTERVAL);
};

const performCleanup = async () => {
    console.log("🧹 Running Trash Cleanup Job...");
    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Purge expired products (listings)
        const [expiredProducts] = await connection.execute(`
            SELECT id, image_url 
            FROM products 
            WHERE status = 'deleted' 
            AND deleted_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [RETENTION_DAYS]);

        for (const p of expiredProducts) {
            if (p.image_url) deleteLocalFile(p.image_url);
            await connection.execute(`DELETE FROM user_inventories WHERE product_id = ?`, [p.id]);
            await connection.execute(`DELETE FROM products WHERE id = ?`, [p.id]);
        }

        // 2. Purge expired inventory items (standalone warehouse items)
        const [expiredInventories] = await connection.execute(`
            SELECT id FROM user_inventories
            WHERE deleted_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [RETENTION_DAYS]);

        for (const inv of expiredInventories) {
            await connection.execute(`DELETE FROM user_inventories WHERE id = ?`, [inv.id]);
        }

        await connection.commit();
        console.log(`✅ Cleanup complete. Purged ${expiredProducts.length} listings and ${expiredInventories.length} warehouse items.`);
    } catch (err) {
        if (connection) await connection.rollback();
        console.error("❌ Trash Cleanup Scheduler Error:", err);
    } finally {
        if (connection) connection.release();
    }
};
