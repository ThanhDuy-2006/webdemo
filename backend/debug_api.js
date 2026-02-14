import jwt from 'jsonwebtoken';
import { connectDB } from "./src/utils/db.js";
import dotenv from "dotenv";
dotenv.config();

const API_URL = 'http://localhost:3000/api';

const run = async () => {
    try {
        const pool = await connectDB();
        
        // 1. Get Admin User
        const [users] = await pool.execute("SELECT * FROM users WHERE email = ?", ['admin@example.com']);
        if (users.length === 0) {
            console.error("Admin user not found!");
            process.exit(1);
        }
        const admin = users[0];
        console.log("Found Admin:", admin.id, admin.email);

        // 2. Generate Token
        const token = jwt.sign(
            { id: admin.id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log("Generated Token");

        // 3. Test Expenses API
        console.log("Fetching Expenses...");
        const res = await fetch(API_URL + '/expenses', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            console.error("API Error:", res.status, await res.text());
        } else {
            const data = await res.json();
            console.log("✅ API Success. Records found:", Array.isArray(data) ? data.length : data);
        }

        // 4. Test Stats API
        console.log("Fetching Stats...");
        const statsRes = await fetch(API_URL + '/expenses/stats?month=2026-02', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!statsRes.ok) {
             console.error("Stats Error:", statsRes.status, await statsRes.text());
        } else {
             const stats = await statsRes.json();
             console.log("✅ Stats Success:", formatStats(stats));
        }

        process.exit(0);
    } catch (e) {
        console.error("Script failed:", e);
        process.exit(1);
    }
};

function formatStats(s) {
    return {
        month: s.month,
        income: s.income,
        expense: s.expense,
        categories: s.categories?.length || 0
    };
}

run();
