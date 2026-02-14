import { connectDB } from "../src/utils/db.js";

async function migrate() {
    console.log("🚀 Starting Excel House Migration...");
    const pool = await connectDB();

    const queries = [
        `CREATE TABLE IF NOT EXISTS house_excel_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            house_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (house_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

        `CREATE TABLE IF NOT EXISTS house_excel_status (
            id INT AUTO_INCREMENT PRIMARY KEY,
            item_id INT NOT NULL,
            user_id INT NOT NULL,
            house_id INT NOT NULL,
            is_checked BOOLEAN DEFAULT FALSE,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY (item_id, user_id),
            INDEX (house_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

        `CREATE TABLE IF NOT EXISTS house_excel_actions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            house_id INT NOT NULL,
            user_id INT NOT NULL,
            action VARCHAR(50) NOT NULL,
            item_name VARCHAR(255),
            target_user_id INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (house_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    ];

    try {
        for (const query of queries) {
            await pool.execute(query);
            console.log("✅ Executed query successfully");
        }
        console.log("🎉 Migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
}

migrate();
