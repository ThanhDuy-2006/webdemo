import { connectDB } from "../../utils/db.js";
import { emitToUser } from "../../utils/socket.js";
import logger from "../../utils/logger.js";

export const getMyWallet = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(`SELECT balance, updated_at FROM wallets WHERE user_id = ?`, [userId]);
        
        if (!rows[0]) {
            // Auto-create if not exists
            await pool.execute(`INSERT IGNORE INTO wallets (user_id, balance) VALUES (?, 0)`, [userId]);
            return res.json({ balance: 0 });
        }
        
        res.json(rows[0]);
    } catch (e) {
        logger.error(e);
        res.status(500).json({ error: "Thao tác ví thất bại" });
    }
};

export const getWalletFull = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        const [wRows] = await pool.execute(`SELECT balance, updated_at FROM wallets WHERE user_id = ?`, [userId]);
        
        let wallet;
        if (!wRows[0]) {
            await pool.execute(`INSERT IGNORE INTO wallets (user_id, balance) VALUES (?, 0)`, [userId]);
            wallet = { balance: "0.00" };
        } else {
            wallet = wRows[0];
        }

        // Get transactions from wallet_transactions
        const [tRows] = await pool.execute(`
            SELECT 
                wt.*,
                u_init.full_name as initiator_name,
                u_init.email as initiator_email,
                u_rel.full_name as partner_name,
                u_rel.email as partner_email
            FROM wallet_transactions wt
            LEFT JOIN users u_init ON wt.user_id = u_init.id
            LEFT JOIN users u_rel ON wt.related_user_id = u_rel.id
            WHERE wt.user_id = ?
            ORDER BY wt.created_at DESC
            LIMIT 50
        `, [userId]);

        wallet.transactions = tRows;
        res.json(wallet);
    } catch (e) {
        logger.error(e);
        res.status(500).json({ error: "Lỗi tải thông tin ví" });
    }
};

export const getWalletStats = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d') as day,
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_deposit,
                SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_spent
            FROM wallet_transactions
            WHERE user_id = ?
              AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY day
            ORDER BY day ASC
        `, [userId]);
        res.json(rows);
    } catch (e) {
        logger.error(e);
        res.status(500).json({ error: "Lỗi tải thống kê ví" });
    }
};

export const adminDeposit = async (req, res) => {
    const { email, amount } = req.body;
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
    if (!email || !amount || isNaN(amount)) return res.status(400).json({ error: "Email and valid amount required" });

    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [uRows] = await connection.execute(`SELECT id FROM users WHERE email = ?`, [email]);
        if (!uRows[0]) {
            await connection.rollback();
            return res.status(404).json({ error: "User not found" });
        }
        const targetUserId = uRows[0].id;

        // Ensure wallet exists and lock it
        await connection.execute(`INSERT IGNORE INTO wallets (user_id, balance) VALUES (?, 0)`, [targetUserId]);
        const [wRows] = await connection.execute(`SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE`, [targetUserId]);
        
        await connection.execute(`UPDATE wallets SET balance = balance + ? WHERE user_id = ?`, [amount, targetUserId]);
        
        // Record as a deposit transaction if possible (optional but recommended)
        // For now, focus on the balance sync
        
        await connection.commit();

        const [finalRows] = await pool.execute(`SELECT balance FROM wallets WHERE user_id = ?`, [targetUserId]);
        
        // Notify user via Socket
        emitToUser(targetUserId, "walletUpdated", { newBalance: finalRows[0]?.balance });
        
        res.json({ ok: true, message: `🚀 Đã nạp ${Number(amount).toLocaleString()}đ cho ${email}` });
    } catch (e) {
        if (connection) await connection.rollback();
        logger.error("Admin Deposit Error:", e);
        res.status(500).json({ error: "Lỗi nạp tiền Admin" });
    } finally {
        if (connection) connection.release();
    }
};

export const getMyTransactions = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(`
            SELECT t.*, p.name as product_name, h.name as house_name 
            FROM transactions t
            JOIN products p ON p.id = t.product_id
            JOIN houses h ON h.id = t.house_id
            WHERE t.user_id = ?
            ORDER BY t.created_at DESC
        `, [userId]);
        res.json(rows);
    } catch (e) {
        logger.error(e);
        res.status(500).json({ error: "Lỗi tải lịch sử giao dịch" });
    }
};

// For testing top-up
export const topUpWallet = async (req, res) => {
    const userId = req.user.id;
    const { amount } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Ensure wallet exists and lock it
        await connection.execute(`INSERT IGNORE INTO wallets (user_id, balance) VALUES (?, 0)`, [userId]);
        await connection.execute(`SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE`, [userId]);

        await connection.execute(`UPDATE wallets SET balance = balance + ? WHERE user_id = ?`, [amount, userId]);
        
        await connection.commit();

        const [rows] = await pool.execute(`SELECT balance FROM wallets WHERE user_id = ?`, [userId]);
        const newBalance = rows[0]?.balance;

        // Notify self via Socket
        emitToUser(userId, "walletUpdated", { newBalance });

        res.json({ ok: true, newBalance });
    } catch (e) {
        if (connection) await connection.rollback();
        logger.error("Top-up Error:", e);
        res.status(500).json({ error: "Lỗi nạp tiền" });
    } finally {
        if (connection) connection.release();
    }
};
