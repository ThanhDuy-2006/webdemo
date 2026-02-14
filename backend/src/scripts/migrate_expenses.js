import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'testdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z'
};

console.log("DEBUG CONFIG:", { ...config, password: config.password ? '******' : 'MISSING' });

async function migrate() {
    let pool;
    let connection;
    try {
        pool = mysql.createPool(config);
        connection = await pool.getConnection();
        console.log("🔌 Connected to DB. Starting migration...");

        // 1. Create expense_categories
        await connection.query(`
            CREATE TABLE IF NOT EXISTS expense_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL, -- NULL = System Default
                name VARCHAR(100) NOT NULL,
                type ENUM('EXPENSE', 'INCOME') NOT NULL,
                icon VARCHAR(50), 
                color VARCHAR(20),
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ Table 'expense_categories' created/verified.");

        // 2. Create financial_records
        await connection.query(`
            CREATE TABLE IF NOT EXISTS financial_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                type ENUM('EXPENSE', 'INCOME') NOT NULL,
                category_id INT,
                transaction_date DATETIME NOT NULL,
                note TEXT,
                image_url VARCHAR(255),
                house_id INT NULL,
                source_type ENUM('MANUAL', 'WALLET', 'ORDER') DEFAULT 'MANUAL',
                source_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL,
                INDEX (user_id, transaction_date),
                UNIQUE KEY unique_source (source_type, source_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ Table 'financial_records' created/verified.");

        // 3. Create budgets
        await connection.query(`
            CREATE TABLE IF NOT EXISTS budgets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                category_id INT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE CASCADE,
                UNIQUE KEY unique_budget (user_id, category_id, month)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ Table 'budgets' created/verified.");

        // 4. Seed Default Categories
        const [rows] = await connection.query("SELECT COUNT(*) as count FROM expense_categories WHERE is_default = TRUE");
        if (rows[0].count === 0) {
            console.log("🌱 Seeding default categories...");
            const defaults = [
                // Expenses
                { name: 'Ăn uống', type: 'EXPENSE', icon: '🍜', color: '#FF6B6B' },
                { name: 'Mua sắm', type: 'EXPENSE', icon: '🛍️', color: '#4ECDC4' },
                { name: 'Sinh hoạt', type: 'EXPENSE', icon: '🏠', color: '#45B7D1' },
                { name: 'Di chuyển', type: 'EXPENSE', icon: '🚗', color: '#96CEB4' },
                { name: 'Giải trí', type: 'EXPENSE', icon: '🎮', color: '#FFEEAD' },
                { name: 'Sức khỏe', type: 'EXPENSE', icon: '🏥', color: '#D4A5A5' },
                { name: 'Khác', type: 'EXPENSE', icon: '📦', color: '#9E9E9E' },
                // Income
                { name: 'Lương', type: 'INCOME', icon: '💰', color: '#2ECC71' },
                { name: 'Đầu tư', type: 'INCOME', icon: '📈', color: '#27AE60' },
                { name: 'Thưởng', type: 'INCOME', icon: '🎁', color: '#F1C40F' },
                { name: 'Khác', type: 'INCOME', icon: '📦', color: '#BDC3C7' }
            ];

            const values = defaults.map(d => `(NULL, '${d.name}', '${d.type}', '${d.icon}', '${d.color}', TRUE)`);
            await connection.query(`
                INSERT INTO expense_categories (user_id, name, type, icon, color, is_default)
                VALUES ${values.join(',')}
            `);
            console.log("✅ Default categories seeded.");
        } else {
            console.log("ℹ️ Default categories already exist. Skipping seed.");
        }

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        if (connection) connection.release();
        if (pool) pool.end();
        process.exit();
    }
}

migrate();
