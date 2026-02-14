import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const config = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const createRefreshTokenTable = `
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME DEFAULT NULL,
    device_fingerprint VARCHAR(255) DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id),
    INDEX (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// Also check if users table has status column if not add it
const checkUserStatus = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' AFTER role;
`;

async function migrate() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to MySQL');

    console.log('Creating refresh_tokens table...');
    await connection.execute(createRefreshTokenTable);
    console.log('✅ refresh_tokens table created/verified');

    // try {
    //   console.log('Attempting to add status column to users...');
    //   await connection.execute(checkUserStatus);
    //   console.log('✅ users table status column added/verified');
    // } catch (e) {
    //   console.log('Note: ALTER TABLE users ADD COLUMN status... might have failed if column already exists or syntax not supported in your MySQL version. (Safe to ignore if it exists)');
    // }

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
