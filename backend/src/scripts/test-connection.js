import { connectDB } from "../utils/db.js";

async function test() {
    try {
        console.log("Connecting...");
        const pool = await connectDB();
        const [rows] = await pool.execute("SELECT VERSION() as version");
        console.log("Connected to MySQL version:", rows[0].version);
        process.exit(0);
    } catch (e) {
        console.error("Connection failed:", e);
        process.exit(1);
    }
}
test();

