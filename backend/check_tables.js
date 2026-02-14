import { connectDB } from "./src/utils/db.js";

async function checkTables() {
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute("SHOW TABLES");
        console.log("Tables in database:", rows.map(r => Object.values(r)[0]));
        process.exit(0);
    } catch (error) {
        console.error("Failed to check tables:", error);
        process.exit(1);
    }
}

checkTables();
