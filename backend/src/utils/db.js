import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const config = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z' // Force UTC
};

let pool;

export async function connectDB() {
  if (!pool) {
    try {
      pool = mysql.createPool(config);
      // Test connection
      const connection = await pool.getConnection();
      console.log('✅ MySQL Connected successfully');
      connection.release();
    } catch (err) {
      console.error('❌ MySQL Connection Failed!', err);
      throw err;
    }
  }
  return pool;
}

export { pool };
