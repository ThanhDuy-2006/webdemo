import { connectDB } from "../src/utils/db.js";

async function migrate() {
    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        console.log("Starting wallet & buy system migration...");

        // 1. Wallets table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS wallets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                balance DECIMAL(15, 2) DEFAULT 0.00,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 2. Transactions table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                house_id INT NOT NULL,
                quantity INT DEFAULT 1,
                unit_price DECIMAL(15, 2) NOT NULL,
                total_price DECIMAL(15, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (house_id) REFERENCES houses(id)
            )
        `);

        // 3. Product Sales Log
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS product_sales_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                buyer_id INT NOT NULL,
                action_type VARCHAR(20) DEFAULT 'BUY',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (buyer_id) REFERENCES users(id)
            )
        `);

        // 4. Update Products table
        const [columns] = await connection.execute("SHOW COLUMNS FROM products");
        const hasUnitPrice = columns.some(c => c.Field === 'unit_price');
        const hasQuantity = columns.some(c => c.Field === 'quantity');

        if (!hasUnitPrice) {
            await connection.execute("ALTER TABLE products ADD COLUMN unit_price DECIMAL(15, 2) DEFAULT 0.00");
        }
        if (!hasQuantity) {
            await connection.execute("ALTER TABLE products ADD COLUMN quantity INT DEFAULT 1");
        }

        // Initialize wallets for existing users
        const [users] = await connection.execute("SELECT id FROM users");
        for (const user of users) {
             await connection.execute("INSERT IGNORE INTO wallets (user_id, balance) VALUES (?, 0)", [user.id]);
        }

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
