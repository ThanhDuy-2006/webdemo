import { connectDB } from "../src/utils/db.js";

async function migrate() {
    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        console.log("Fixing financial_records unique key...");

        // 1. Check if unique_source exists
        const [indexes] = await connection.execute("SHOW INDEX FROM financial_records");
        const hasOldUnique = indexes.some(i => i.Key_name === 'unique_source');

        if (hasOldUnique) {
            console.log("Dropping old unique_source index...");
            await connection.execute("ALTER TABLE financial_records DROP INDEX unique_source");
        }

        // 2. Add new refined unique index
        console.log("Adding new multi-user unique index...");
        await connection.execute(`
            ALTER TABLE financial_records 
            ADD UNIQUE KEY unique_user_source (user_id, source_type, source_id)
        `);
        
        console.log("Migration successful!");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e.message);
        process.exit(1);
    } finally {
        if (connection) connection.release();
    }
}

migrate();
