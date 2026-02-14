import { connectDB } from "./src/utils/db.js";

async function createAndVerify() {
    try {
        const pool = await connectDB();
        console.log("Creating table...");
        const sql = `
            CREATE TABLE IF NOT EXISTS user_follow_comics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                comic_slug VARCHAR(255) NOT NULL,
                comic_name VARCHAR(255) NOT NULL,
                comic_thumb VARCHAR(500),
                last_chapter VARCHAR(50),
                notify_enabled BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_follow (user_id, comic_slug),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `;
        await pool.execute(sql);
        console.log("Execute finished.");
        
        const [rows] = await pool.execute("SHOW TABLES LIKE 'user_follow_comics'");
        if (rows.length > 0) {
            console.log("VERIFIED: Table user_follow_comics exists.");
        } else {
            console.log("FAILED: Table still does not exist after creation.");
        }
        process.exit(0);
    } catch (error) {
        console.error("Critical Failure:", error);
        process.exit(1);
    }
}

createAndVerify();
