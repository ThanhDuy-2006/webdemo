import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../src/utils/db.js';

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

async function migrate() {
  try {
    const pool = await connectDB();
    console.log('✅ Connected to MySQL via pool');

    console.log('Creating refresh_tokens table...');
    await pool.execute(createRefreshTokenTable);
    console.log('✅ refresh_tokens table created/verified');

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
