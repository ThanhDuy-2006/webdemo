import { connectDB } from "../src/utils/db.js";

async function migrate() {
    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        console.log("Adding type column to transactions table...");

        const [columns] = await connection.execute("SHOW COLUMNS FROM transactions");
        const hasType = columns.some(c => c.Field === 'type');

        if (!hasType) {
            await connection.execute("ALTER TABLE transactions ADD COLUMN type ENUM('PAYMENT', 'REFUND') DEFAULT 'PAYMENT'");
            console.log("Column 'type' added.");
        } else {
            console.log("Column 'type' already exists.");
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
