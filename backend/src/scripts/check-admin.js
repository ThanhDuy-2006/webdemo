import { connectDB } from "../utils/db.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// Default values from .env
// Securely load from .env
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || "Admin User";

if (!email || !password) {
    console.error("❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
    process.exit(1);
}

async function run() {
    try {
        const pool = await connectDB();
        
        // Check if user exists
        const [rows] = await pool.execute(
            "SELECT id, full_name, email, role FROM users WHERE email = ?",
            [email]
        );
            
        if (rows.length > 0) {
            const user = rows[0];
            console.log("✅ Admin account exists:");
            console.log(`   Email: ${user.email}`);
            console.log(`   Role: ${user.role}`);
            if (user.role !== 'admin') {
                console.log("⚠️ User exists but is NOT admin. Updating role...");
                await pool.execute("UPDATE users SET role = 'admin' WHERE email = ?", [email]);
                console.log("✅ Role updated to ADMIN.");
            }
        } else {
            console.log("❌ Admin account not found. Creating...");
            const hash = await bcrypt.hash(password, 10);
            await pool.execute(`
                INSERT INTO users (full_name, email, password_hash, role, phone) 
                VALUES (?, ?, ?, 'admin', '0909090909')
            `, [name, email, hash]);
            console.log("✅ Admin created successfully!");
            console.log(`   Email: ${email}`);
        }
        process.exit(0);
    } catch (e) {
        console.error("❌ Error:", e);
        process.exit(1);
    }
}

run();

