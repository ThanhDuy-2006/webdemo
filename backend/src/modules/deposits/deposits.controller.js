import { connectDB } from "../../utils/db.js";
import { emitToUser } from "../../utils/socket.js";
import logger from "../../utils/logger.js";

/**
 * USER: Create a new deposit request
 */
export const createDepositRequest = async (req, res) => {
    const userId = req.user.id;
    const { amount, method } = req.body;
    const proof_image = req.file ? `/uploads/${req.file.filename}` : null;

    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: "Số tiền không hợp lệ" });
    }

    if (!['BANK_TRANSFER', 'MOMO', 'CASH'].includes(method)) {
        return res.status(400).json({ error: "Phương thức thanh toán không hợp lệ" });
    }

    try {
        const pool = await connectDB();
        await pool.execute(
            "INSERT INTO deposit_requests (user_id, amount, method, proof_image, status) VALUES (?, ?, ?, ?, 'PENDING')",
            [userId, amount, method, proof_image]
        );

        res.json({ success: true, message: "Yêu cầu nạp tiền đã được gửi, vui lòng chờ duyệt." });
    } catch (err) {
        logger.error("Create Deposit Request Error:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi gửi yêu cầu." });
    }
};

/**
 * USER: Get my deposit requests
 */
export const getMyDepositRequests = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(
            "SELECT * FROM deposit_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            [userId]
        );
        res.json(rows);
    } catch (err) {
        logger.error("Get My Deposit Requests Error:", err);
        res.status(500).json({ error: "Lỗi tải danh sách yêu cầu." });
    }
};

/**
 * ADMIN: Get all deposit requests
 */
export const getAllDepositRequestsAdmin = async (req, res) => {
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(`
            SELECT dr.*, u.full_name, u.email 
            FROM deposit_requests dr
            JOIN users u ON dr.user_id = u.id
            ORDER BY dr.status = 'PENDING' DESC, dr.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        logger.error("Get All Deposit Requests Error:", err);
        res.status(500).json({ error: "Lỗi tải danh sách yêu cầu admin." });
    }
};

/**
 * ADMIN: Approve deposit request
 */
export const approveDepositRequest = async (req, res) => {
    const { id } = req.params;
    const { admin_note } = req.body;
    let connection;

    try {
        const pool = await connectDB();
        connection = await pool.getConnection();

        // 1. Lock the request and check status
        await connection.beginTransaction();
        const [requests] = await connection.execute(
            "SELECT * FROM deposit_requests WHERE id = ? FOR UPDATE",
            [id]
        );

        const request = requests[0];
        if (!request) {
            await connection.rollback();
            return res.status(404).json({ error: "Yêu cầu không tồn tại" });
        }

        if (request.status !== 'PENDING') {
            await connection.rollback();
            return res.status(400).json({ error: "Yêu cầu này đã được xử lý" });
        }

        const { user_id, amount } = request;

        // 2. Ensure wallet exists and lock it
        await connection.execute("INSERT IGNORE INTO wallets (user_id, balance) VALUES (?, 0)", [user_id]);
        await connection.execute("SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE", [user_id]);

        // 3. Update wallet balance
        await connection.execute(
            "UPDATE wallets SET balance = balance + ?, updated_at = NOW() WHERE user_id = ?",
            [amount, user_id]
        );

        // 4. Record wallet transaction
        // wallet_transactions schema: id, user_id, related_user_id, type, amount, description, deposit_request_id
        await connection.execute(
            `INSERT INTO wallet_transactions (user_id, type, amount, description, deposit_request_id) 
             VALUES (?, 'DEPOSIT', ?, ?, ?)`,
            [user_id, amount, `Nạp tiền qua ${request.method} (Yêu cầu #${id})`, id]
        );

        // 5. Update deposit request status
        await connection.execute(
            "UPDATE deposit_requests SET status = 'APPROVED', processed_at = NOW(), admin_note = ? WHERE id = ?",
            [admin_note || null, id]
        );

        await connection.commit();
        logger.info(`Admin #${req.user.id} approved deposit #${id} for user #${user_id} amount ${amount}`);

        // 6. Notify user via Socket
        const [walletRows] = await pool.execute("SELECT balance FROM wallets WHERE user_id = ?", [user_id]);
        emitToUser(user_id, "walletUpdated", { 
            newBalance: walletRows[0].balance,
            message: `Yêu cầu nạp ${Number(amount).toLocaleString()}đ của bạn đã được duyệt!`
        });

        res.json({ success: true, message: "Đã duyệt yêu cầu thành công." });

    } catch (err) {
        if (connection) await connection.rollback();
        logger.error("Approve Deposit Error:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi duyệt yêu cầu." });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * ADMIN: Reject deposit request
 */
export const rejectDepositRequest = async (req, res) => {
    const { id } = req.params;
    const { admin_note } = req.body;

    try {
        const pool = await connectDB();
        const [rows] = await pool.execute("SELECT status, user_id, amount FROM deposit_requests WHERE id = ?", [id]);
        
        if (!rows[0]) return res.status(404).json({ error: "Yêu cầu không tồn tại" });
        if (rows[0].status !== 'PENDING') return res.status(400).json({ error: "Yêu cầu đã được xử lý" });

        await pool.execute(
            "UPDATE deposit_requests SET status = 'REJECTED', processed_at = NOW(), admin_note = ? WHERE id = ?",
            [admin_note || "Yêu cầu bị từ chối", id]
        );

        logger.info(`Admin #${req.user.id} rejected deposit #${id} reason: ${admin_note}`);
        
        emitToUser(rows[0].user_id, "depositRejected", {
            amount: rows[0].amount,
            reason: admin_note || "Yêu cầu bị từ chối"
        });

        res.json({ success: true, message: "Đã từ chối yêu cầu." });
    } catch (err) {
        logger.error("Reject Deposit Error:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi từ chối yêu cầu." });
    }
};
