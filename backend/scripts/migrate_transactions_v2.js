import { connectDB } from "../src/utils/db.js";

async function migrate() {
    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        console.log("Adding description and amount fields to transactions...");

        const [columns] = await connection.execute("SHOW COLUMNS FROM transactions");
        const hasDescription = columns.some(c => c.Field === 'description');
        const hasAmount = columns.some(c => c.Field === 'amount');

        if (!hasDescription) {
            await connection.execute("ALTER TABLE transactions ADD COLUMN description TEXT");
        }
        
        // We will migrate 'total_price' logic to 'amount' logic for better flexibility
        // But for now, let's just use total_price as the base and add description.
        
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
