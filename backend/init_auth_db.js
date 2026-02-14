
import { connectDB } from "./src/utils/db.js";

const run = async () => {
    try {
        const pool = await connectDB();
        console.log("Connected to DB...");

        // Create password_resets table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS password_resets (
                email VARCHAR(255) NOT NULL,
                token VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                PRIMARY KEY (token),
                INDEX (email)
            )
        `);
        console.log("✅ password_resets table created/verified.");

        // Check if users table has deleted_at (just in case)
        // (Skipping as it was done in previous task, but good to keep in mind)
        
        console.log("Migration complete.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
};

run();
