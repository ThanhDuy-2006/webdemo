import { connectDB } from "../src/utils/db.js";

async function migrate() {
    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        console.log("Adding details field to house_excel_actions...");

        const [columns] = await connection.execute("SHOW COLUMNS FROM house_excel_actions");
        const hasDetails = columns.some(c => c.Field === 'details');

        if (!hasDetails) {
            await connection.execute("ALTER TABLE house_excel_actions ADD COLUMN details TEXT");
        }
        
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
