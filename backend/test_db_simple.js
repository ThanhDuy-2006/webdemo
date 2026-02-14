import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function test() {
  try {
    const pool = mysql.createPool(config);
    const conn = await pool.getConnection();
    console.log("DB_OK");
    conn.release();
    process.exit(0);
  } catch (e) {
    console.error("DB_FAIL", e.message);
    process.exit(1);
  }
}
test();
