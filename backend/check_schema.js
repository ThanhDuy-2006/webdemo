import { connectDB } from "./src/utils/db.js";
const pool = await connectDB();
console.log("--- user_inventories ---");
const [inv] = await pool.execute("DESCRIBE user_inventories");
console.log(inv);
process.exit(0);
