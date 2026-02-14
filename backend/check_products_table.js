import { connectDB } from "./src/utils/db.js";
import dotenv from "dotenv";
dotenv.config();

const check = async () => {
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute("DESCRIBE products");
        console.log("Columns in products:", rows.map(r => r.Field));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
check();
