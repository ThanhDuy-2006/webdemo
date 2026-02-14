import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './backend/.env' });

async function check() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '123456',
        database: process.env.DB_NAME || 'testdb',
        port: parseInt(process.env.DB_PORT || '3306')
    });

    try {
        const [users] = await conn.execute('SELECT id, full_name, email FROM users WHERE full_name LIKE "%hào%" OR email LIKE "%hào%"');
        console.log('--- FOUND USERS ---');
        console.log(users);

        if (users.length > 0) {
            const uid = users[0].id;
            console.log(`--- RECENT TRANSACTIONS FOR USER ID: ${uid} ---`);
            const [tx] = await conn.execute('SELECT * FROM wallet_transactions WHERE user_id = ? OR related_user_id = ? ORDER BY created_at DESC LIMIT 20', [uid, uid]);
            console.log(tx);

            console.log(`--- YEAR-MONTH AGGREGATION FOR USER ID: ${uid} ---`);
            const [agg] = await conn.execute(`
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as mes,
                    type,
                    SUM(amount) as s_amount
                FROM wallet_transactions
                WHERE user_id = ? OR related_user_id = ?
                GROUP BY mes, type
            `, [uid, uid]);
            console.log(agg);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await conn.end();
    }
}

check();
