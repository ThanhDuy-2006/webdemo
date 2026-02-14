import { connectDB } from "../../utils/db.js";
import { createNotification } from "../notifications/notifications.service.js";

export const createRequest = async (req, res) => {
    const { house_id, product_id, qty } = req.body || {};
    const userId = req.user.id;

    if (!house_id || !product_id || !qty) return res.status(400).json({ error: "Missing fields" });

    try {
        const pool = await connectDB();

        // Check product
        const [pRows] = await pool.execute(`SELECT seller_id, name FROM products WHERE id = ?`, [product_id]);
        if (!pRows[0]) return res.status(404).json({ error: "Product not found" });
        const product = pRows[0];

        if (product.seller_id !== userId) return res.status(403).json({ error: "Not your product" });

        // Get House Owner
        const [hRows] = await pool.execute(`SELECT owner_id FROM houses WHERE id = ?`, [house_id]);
        const ownerId = hRows[0]?.owner_id;

        const [result] = await pool.execute(
            `INSERT INTO stock_requests(house_id, requestor_id, product_id, product_name, quantity, status)
             VALUES(?, ?, ?, ?, ?, 'pending')`,
            [house_id, userId, product_id, product.name, qty]
        );

        const requestId = result.insertId;

        // NOTIFICATION: Notify House Owner
        if (ownerId && ownerId !== userId) {
            await createNotification({
                userId: ownerId,
                houseId: house_id,
                type: 'STOCK_REQUEST_APPROVAL',
                title: 'Yêu cầu nhập hàng mới',
                message: `${req.user.full_name || 'Thành viên'} yêu cầu nhập ${qty} ${product.name}`,
                data: { requestId: requestId, productId: product_id }
            });
        }
        
        const [newRows] = await pool.execute(`SELECT * FROM stock_requests WHERE id = ?`, [requestId]);
        res.json(newRows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Request failed" });
    }
};

export const getRequests = async (req, res) => {
    const { house_id, status } = req.query;
    if (!house_id) return res.status(400).json({ error: "Missing house_id" });
    
    try {
        const pool = await connectDB();
        let query = `
            SELECT sr.*, u.full_name as user_name
            FROM stock_requests sr
            JOIN users u ON u.id = sr.requestor_id
            WHERE sr.house_id = ?
        `;
        const params = [house_id];

        if (status) {
            query += ` AND sr.status = ?`;
            params.push(status);
        }
        query += ` ORDER BY sr.created_at DESC`;

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Get requests failed" });
    }
};

export const approveRequest = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: "Invalid status" });

    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [reqRows] = await connection.execute(`SELECT * FROM stock_requests WHERE id = ?`, [id]);
        if (!reqRows[0]) {
             await connection.rollback();
             return res.status(404).json({ error: "Request not found" });
        }
        const reqData = reqRows[0];

        // Verify House Owner
        const [mRows] = await connection.execute(
            `SELECT role FROM user_houses WHERE house_id = ? AND user_id = ?`,
            [reqData.house_id, userId]
        );
            
        if (mRows[0]?.role !== 'owner') {
             await connection.rollback();
             return res.status(403).json({ error: "House Owner only" });
        }

        if (reqData.status !== 'pending') {
             await connection.rollback();
             return res.status(400).json({ error: "Already processed" });
        }

        await connection.execute(`UPDATE stock_requests SET status = ? WHERE id = ?`, [status, id]);

        if (status === 'approved') {
            let finalPid = reqData.product_id;

            if (!finalPid && reqData.product_name) {
                 const [pFind] = await connection.execute(
                    `SELECT id FROM products WHERE seller_id = ? AND name = ?`,
                    [reqData.requestor_id, reqData.product_name]
                 );
                 if (pFind[0]) finalPid = pFind[0].id;
            }

            if (finalPid) {
                 await connection.execute(`
                        UPDATE user_inventories 
                        SET quantity = quantity + ? 
                        WHERE user_id = ? AND product_id = ?
                     `, [reqData.quantity, reqData.requestor_id, finalPid]);
            }
        }

        await connection.commit();

        // NOTIFICATION: Notify Requestor
        await createNotification({
            userId: reqData.requestor_id,
            houseId: reqData.house_id,
            type: status === 'approved' ? 'STOCK_APPROVED' : 'STOCK_REJECTED',
            title: status === 'approved' ? 'Yêu cầu nhập hàng được duyệt' : 'Yêu cầu nhập hàng bị từ chối',
            message: `Yêu cầu nhập ${reqData.quantity} ${reqData.product_name || 'sản phẩm'} của bạn đã ${status === 'approved' ? 'được duyệt' : 'bị từ chối'}.`,
            data: { requestId: id, productId: reqData.product_id }
        });

        res.json({ ok: true });
    } catch (e) {
        if (connection) await connection.rollback();
        console.error(e);
        res.status(500).json({ error: "Process failed" });
    } finally {
        if (connection) connection.release();
    }
};

