import { connectDB } from "../../utils/db.js";
import { emitToUser, emitToHouse } from "../../utils/socket.js";
import logger from "../../utils/logger.js";

export const checkout = async (req, res) => {
  const userId = req.user.id;
  let connection; 
  try {
    const pool = await connectDB();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get Cart
    const [carts] = await connection.execute(`SELECT id FROM carts WHERE user_id = ?`, [userId]);
    const cartId = carts[0]?.id;
    if (!cartId) throw new Error("Giỏ hàng trống");

    // Get Items
    const { productIds } = req.body; // Expect an array of product IDs if selective
    
    let query = `
        SELECT ci.product_id, ci.quantity as qty, p.price, p.unit_price, p.quantity as total_qty, p.seller_id, p.house_id, h.name as house_name
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        JOIN houses h ON h.id = p.house_id
        WHERE ci.cart_id = ?
    `;
    const params = [cartId];

    if (Array.isArray(productIds) && productIds.length > 0) {
        const placeholders = productIds.map(() => "?").join(",");
        query += ` AND ci.product_id IN (${placeholders})`;
        params.push(...productIds);
    }
    
    const [items] = await connection.execute(query, params);
    
    if (items.length === 0) throw new Error("Giỏ hàng không có sản phẩm được chọn");

    let totalAmount = 0;
    const houseNames = [...new Set(items.map(i => i.house_name))].join(", ");

    // Verify Stock & Calc Total
    for (const item of items) {
        // Use FOR UPDATE for locking row in MySQL
        const [inv] = await connection.execute(
            `SELECT quantity FROM user_inventories WHERE user_id = ? AND product_id = ? AND is_selling = 1 FOR UPDATE`,
            [item.seller_id, item.product_id]
        );
            
        const stock = inv[0]?.quantity || 0;
        if (stock < item.qty) throw new Error(`Sản phẩm ${item.product_id} không đủ tồn kho`);
        
        // Use unit_price if available, otherwise calculate from price / total_qty
        const unitPrice = (item.unit_price && Number(item.unit_price) > 0) 
            ? Number(item.unit_price) 
            : (Number(item.total_qty) > 0 ? Number(item.price) / Number(item.total_qty) : Number(item.price));
            
        item.actual_unit_price = unitPrice; // Store for later use
        totalAmount += unitPrice * item.qty;
    }

    // Check Wallet (New Wallet System)
    const [wallets] = await connection.execute(
        `SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE`,
        [userId]
    );
    if (!wallets[0]) throw new Error("Bạn chưa có ví tiền. Vui lòng truy cập trang cá nhân để tạo ví.");
    
    const balance = Number(wallets[0].balance || 0);
    if (balance < totalAmount) throw new Error("Số dư ví không đủ. Vui lòng nạp thêm!");

    // Deduct Buyer
    await connection.execute(
        `UPDATE wallets SET balance = balance - ? WHERE user_id = ?`,
        [totalAmount, userId]
    );

    // Group by House
    const itemsByHouse = items.reduce((acc, item) => {
        if (!acc[item.house_id]) acc[item.house_id] = [];
        acc[item.house_id].push(item);
        return acc;
    }, {});

    const orderIds = [];
    for (const houseId of Object.keys(itemsByHouse)) {
        const houseItems = itemsByHouse[houseId];
        const houseTotal = houseItems.reduce((sum, i) => sum + Number(i.price) * i.qty, 0);

        // Create Order
        const [oRes] = await connection.execute(
            `INSERT INTO orders (house_id, buyer_id, total_amount, status) VALUES (?, ?, ?, 'paid')`,
            [houseId, userId, houseTotal]
        );
            
        const orderId = oRes.insertId;
        orderIds.push(orderId);

        for (const item of houseItems) {
            // Deduct Stock
            await connection.execute(
                `UPDATE user_inventories SET quantity = quantity - ? WHERE user_id = ? AND product_id = ?`,
                [item.qty, item.seller_id, item.product_id]
            );

            // Clean up if sold out
            await connection.execute(
                `UPDATE products SET quantity = quantity - ? WHERE id = ?`,
                [item.qty, item.product_id]
            );

            // Clean up inventory if sold out
            await connection.execute(
                `DELETE FROM user_inventories WHERE user_id = ? AND product_id = ? AND quantity <= 0`,
                [item.seller_id, item.product_id]
            );

            // Add Order Item
            await connection.execute(
                `INSERT INTO order_items (order_id, product_id, seller_id, quantity, price) VALUES (?, ?, ?, ?, ?)`,
                [orderId, item.product_id, item.seller_id, item.qty, item.price]
            );

            // Pay Seller (New Wallet System)
            await connection.execute(
                `UPDATE wallets SET balance = balance + ? WHERE user_id = ?`,
                [Number(item.price) * item.qty, item.seller_id]
            );

            // Record in NEW Transactions System (For House History)
            await connection.execute(
                `INSERT INTO transactions (user_id, product_id, house_id, quantity, unit_price, total_price)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, item.product_id, houseId, item.qty, item.actual_unit_price, item.actual_unit_price * item.qty]
            );

            // Record in Sales Log
            await connection.execute(
                `INSERT INTO product_sales_log (product_id, buyer_id, action_type)
                 VALUES (?, ?, 'CHECKOUT')`,
                [item.product_id, userId]
            );

            // Add to Buyer Inventory
            const [buyerInv] = await connection.execute(
                `SELECT id FROM user_inventories WHERE user_id = ? AND product_id = ?`,
                [userId, item.product_id]
            );

            if (buyerInv[0]) {
                await connection.execute(
                    `UPDATE user_inventories SET quantity = quantity + ? WHERE id = ?`,
                    [item.qty, buyerInv[0].id]
                );
            } else {
                await connection.execute(
                    `INSERT INTO user_inventories (user_id, product_id, quantity, is_selling) VALUES (?, ?, ?, 0)`,
                    [userId, item.product_id, item.qty]
                );
            }
        }
    }

    // Clear Purchased Items from Cart
    const purchasedProductIds = items.map(i => i.product_id);
    const placeholders = purchasedProductIds.map(() => "?").join(",");
    await connection.execute(
        `DELETE FROM cart_items WHERE cart_id = ? AND product_id IN (${placeholders})`,
        [cartId, ...purchasedProductIds]
    );

    await connection.commit();

    // --- REALTIME NOTIFICATIONS ---
    // 1. Notify Buyer about balance
    const [buyerWallet] = await pool.execute(`SELECT balance FROM wallets WHERE user_id = ?`, [userId]);
    emitToUser(userId, "walletUpdated", { newBalance: buyerWallet[0]?.balance });

    // 2. Notify Sellers and House Rooms
    for (const item of items) {
        // Notify seller about their income
        const [sellerWallet] = await pool.execute(`SELECT balance FROM wallets WHERE user_id = ?`, [item.seller_id]);
        emitToUser(item.seller_id, "walletUpdated", { newBalance: sellerWallet[0]?.balance });
        
        // Notify everyone in the house room that a product was updated (qty changed)
        // We fetch updated product info
        const [pRows] = await pool.execute("SELECT id, quantity FROM products WHERE id = ?", [item.product_id]);
        emitToHouse(item.house_id, "productUpdated", { 
            productId: item.product_id, 
            newQuantity: pRows[0]?.quantity 
        });

        // Send a notification event
        emitToUser(item.seller_id, "newNotification", { 
            message: `Sản phẩm '${item.product_name}' vừa được mua (${item.qty} cái)!` 
        });
    }

    res.json({ ok: true, orderIds });

  } catch (e) {
    if (connection) await connection.rollback();
    logger.error("Checkout Error:", e);
    res.status(500).json({ error: e.message || "Thanh toán thất bại" });
  } finally {
    if (connection) connection.release();
  }
};

export const getMyOrders = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(`
            SELECT o.*, h.name as house_name 
            FROM orders o
            JOIN houses h ON h.id = o.house_id
            WHERE o.buyer_id = ?
            ORDER BY o.created_at DESC
        `, [userId]);
        res.json(rows);
    } catch (e) {
        logger.error(e);
        res.status(500).json({ error: "Lỗi hệ thống khi tải đơn hàng" });
    }
};

export const getOrderDetail = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(`
            SELECT oi.*, p.name as product_name, p.image_url, u.full_name as seller_name
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            JOIN users u ON u.id = oi.seller_id
            WHERE oi.order_id = ?
        `, [id]);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to get order detail" });
    }
};
export const getMyPurchasedItems = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(`
            SELECT 
                oi.id, 
                oi.product_id, 
                oi.quantity, 
                oi.price, 
                o.created_at,
                p.name as product_name, 
                p.image_url, 
                h.name as house_name,
                h.id as house_id
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN products p ON p.id = oi.product_id
            JOIN houses h ON h.id = o.house_id
            WHERE o.buyer_id = ?
            ORDER BY o.created_at DESC
        `, [userId]);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to get purchased items" });
    }
};

export const getMySoldItems = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(`
            SELECT 
                oi.id, 
                oi.product_id, 
                oi.quantity, 
                oi.price, 
                o.created_at,
                p.name as product_name, 
                p.image_url, 
                h.name as house_name,
                u.full_name as buyer_name,
                u.email as buyer_email
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN products p ON p.id = oi.product_id
            JOIN houses h ON h.id = o.house_id
            JOIN users u ON u.id = o.buyer_id
            WHERE oi.seller_id = ?
            ORDER BY o.created_at DESC
        `, [userId]);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to get sold items" });
    }
};
