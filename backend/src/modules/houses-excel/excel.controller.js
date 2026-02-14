import { connectDB } from "../../utils/db.js";
import { createNotification } from "../notifications/notifications.service.js";

/**
 * Helper to log actions
 */
const logAction = async (connection, houseId, userId, action, itemName, targetUserId = null, details = null) => {
    await connection.execute(
        `INSERT INTO house_excel_actions (house_id, user_id, action, item_name, target_user_id, details) VALUES (?, ?, ?, ?, ?, ?)`,
        [houseId, userId, action, itemName, targetUserId, details]
    );
};

/**
 * Check if user is Admin/Owner of the house
 */
const getHouseRole = async (pool, houseId, userId) => {
    const [rows] = await pool.execute(
        `SELECT role FROM user_houses WHERE house_id = ? AND user_id = ?`,
        [houseId, userId]
    );
    return rows[0]?.role || null;
};

// --- Items Management ---

export const getExcelData = async (req, res) => {
    const { houseId } = req.params;
    try {
        const pool = await connectDB();
        
        // 1. Get items - Only show items linked to Active products with Stock
        // If an item has NO product_id (legacy), show it for migration.
        // If it HAS product_id, only show if NOT deleted and quantity > 0.
        const [items] = await pool.execute(
            `SELECT i.* 
             FROM house_excel_items i
             LEFT JOIN products p ON p.id = i.product_id
             WHERE i.house_id = ? 
               AND (i.product_id IS NULL OR (p.status != 'deleted' AND p.quantity > 0))
             ORDER BY i.created_at ASC`,
            [houseId]
        );

        // 2. Get status matrix
        const [status] = await pool.execute(
            `SELECT * FROM house_excel_status WHERE house_id = ?`,
            [houseId]
        );

        // 3. Get members (to build columns)
        const [members] = await pool.execute(
            `SELECT u.id, u.full_name, uh.role 
             FROM user_houses uh 
             JOIN users u ON u.id = uh.user_id 
             WHERE uh.house_id = ? AND uh.role != 'pending'`,
            [houseId]
        );

        // --- MIGRATION: Auto-create products for existing items that don't have one ---
        const itemsToMigrate = items.filter(i => !i.product_id);
        if (itemsToMigrate.length > 0) {
            const [houseRows] = await pool.execute(`SELECT owner_id FROM houses WHERE id = ?`, [houseId]);
            const ownerId = houseRows[0]?.owner_id;
            if (ownerId) {
                for (const item of itemsToMigrate) {
                    try {
                        const unitPrice = (item.quantity > 0) ? (parseFloat(item.price || 0) / item.quantity) : parseFloat(item.price || 0);
                        const [pRes] = await pool.execute(
                            `INSERT INTO products (house_id, seller_id, name, price, unit_price, quantity, status) VALUES (?, ?, ?, ?, ?, ?, 'active')`,
                            [houseId, ownerId, item.name, item.price || 0, unitPrice, item.quantity || 1]
                        );
                        const productId = pRes.insertId;
                        await pool.execute(
                            `INSERT INTO user_inventories (user_id, product_id, quantity) VALUES (?, ?, ?)`,
                            [ownerId, productId, item.quantity || 1]
                        );
                        await pool.execute(`UPDATE house_excel_items SET product_id = ? WHERE id = ?`, [productId, item.id]);
                        item.product_id = productId; // Update local object
                    } catch (err) {
                        console.error("Migration error for item", item.id, err);
                    }
                }
            }
        }

        res.json({ items, status, members });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch excel data" });
    }
};

export const createItem = async (req, res) => {
    const { houseId } = req.params;
    const { name, price, quantity, items } = req.body;
    const userId = req.user.id;

    let connection;
    try {
        const pool = await connectDB();
        const role = await getHouseRole(pool, houseId, userId);
        if (role !== 'owner' && role !== 'admin') {
            return res.status(403).json({ error: "Only admins can add items" });
        }

        const itemsToProcess = [];
        if (items && Array.isArray(items)) {
            itemsToProcess.push(...items);
        } else if (name) {
            const names = name.split(/[\n,]+/).map(n => n.trim()).filter(n => n.length > 0);
            names.forEach(n => itemsToProcess.push({ name: n, price: price || 0, quantity: quantity || 1 }));
        }

        if (itemsToProcess.length === 0) return res.status(400).json({ error: "No valid items provided" });

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const createdItems = [];
        for (const item of itemsToProcess) {
            const itemName = item.name;
            const itemPrice = item.price || 0;
            const itemQty = item.quantity || 1;
            const itemDesc = item.description || "";

            if (!itemName) continue;

            // 1. Create real Product
            const unitPrice = (itemQty > 0) ? (itemPrice / itemQty) : itemPrice;
            const [pRes] = await connection.execute(
                `INSERT INTO products (house_id, seller_id, name, description, price, unit_price, quantity, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
                [houseId, userId, itemName, itemDesc, itemPrice, unitPrice, itemQty]
            );
            const productId = pRes.insertId;

            // 2. Add to Inventory
            await connection.execute(
                `INSERT INTO user_inventories (user_id, product_id, quantity) VALUES (?, ?, ?)`,
                [userId, productId, itemQty]
            );

            // 3. Create Excel Item linked to product
            const [result] = await connection.execute(
                `INSERT INTO house_excel_items (house_id, name, price, quantity, product_id) VALUES (?, ?, ?, ?, ?)`,
                [houseId, itemName, itemPrice, itemQty, productId]
            );
            
            await logAction(connection, houseId, userId, 'create_item', itemName);
            createdItems.push({ id: result.insertId, name: itemName, house_id: houseId, price: itemPrice, quantity: itemQty, product_id: productId });
        }

        await connection.commit();
        res.json(createdItems.length === 1 ? createdItems[0] : { success: true, count: createdItems.length, items: createdItems });
    } catch (e) {
        if (connection) await connection.rollback();
        console.error(e);
        res.status(500).json({ error: "Failed to create item(s)" });
    } finally {
        if (connection) connection.release();
    }
};

export const updateItem = async (req, res) => {
    const { houseId, itemId } = req.params;
    const { name, price, quantity } = req.body;
    const userId = req.user.id;

    let connection;
    try {
        const pool = await connectDB();
        const role = await getHouseRole(pool, houseId, userId);
        if (role !== 'owner' && role !== 'admin') {
            return res.status(403).json({ error: "Only admins can update items" });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [oldItems] = await connection.execute(`SELECT name, product_id FROM house_excel_items WHERE id = ?`, [itemId]);
        if (!oldItems[0]) throw new Error("Item not found");
        const productId = oldItems[0].product_id;

        // Sync with Products
        if (productId) {
            const unitPrice = (quantity > 0) ? (price / quantity) : price;
            await connection.execute(
                `UPDATE products SET name = ?, price = ?, unit_price = ?, quantity = ? WHERE id = ?`,
                [name, price, unitPrice, quantity, productId]
            );
            await connection.execute(
                `UPDATE user_inventories SET quantity = ? WHERE product_id = ? AND user_id = ?`,
                [quantity, productId, userId]
            );
        }

        await connection.execute(
            `UPDATE house_excel_items SET name = ?, price = ?, quantity = ? WHERE id = ?`,
            [name, price, quantity, itemId]
        );

        await logAction(connection, houseId, userId, 'update_item', `${oldItems[0].name} (Cập nhật dữ liệu)`);

        await connection.commit();
        res.json({ success: true });
    } catch (e) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
};

export const deleteItem = async (req, res) => {
    const { houseId, itemId } = req.params;
    const userId = req.user.id;

    let connection;
    try {
        const pool = await connectDB();
        const role = await getHouseRole(pool, houseId, userId);
        if (role !== 'owner' && role !== 'admin') {
            return res.status(403).json({ error: "Only admins can delete items" });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [oldItems] = await connection.execute(`SELECT name, product_id FROM house_excel_items WHERE id = ?`, [itemId]);
        const productId = oldItems[0]?.product_id;
        
        if (productId) {
            await connection.execute(`DELETE FROM products WHERE id = ?`, [productId]);
            await connection.execute(`DELETE FROM user_inventories WHERE product_id = ?`, [productId]);
        }

        await connection.execute(`DELETE FROM house_excel_items WHERE id = ?`, [itemId]);
        await connection.execute(`DELETE FROM house_excel_status WHERE item_id = ?`, [itemId]);

        if (oldItems[0]) {
            await logAction(connection, houseId, userId, 'delete_item', oldItems[0].name);
        }

        await connection.commit();
        res.json({ success: true });
    } catch (e) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
};

// --- Status Toggling ---

export const toggleStatus = async (req, res) => {
    const { houseId, itemId } = req.params;
    const { targetUserId, isChecked } = req.body;
    const userId = req.user.id;

    let connection;
    try {
        const pool = await connectDB();
        const myRole = await getHouseRole(pool, houseId, userId);
        
        // Permission check
        const isAdmin = (myRole === 'owner' || myRole === 'admin');
        if (!isAdmin && userId !== Number(targetUserId)) {
            return res.status(403).json({ error: "Chỉ admin hoặc chính người dùng mới có thể thay đổi trạng thái" });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Get Item and Product info (Lock for update)
        const [itemRows] = await connection.execute(
            `SELECT i.name, i.price, i.product_id, p.seller_id 
             FROM house_excel_items i 
             JOIN products p ON p.id = i.product_id
             WHERE i.id = ? FOR UPDATE`,
            [itemId]
        );
        if (!itemRows[0]) throw new Error("Không tìm thấy sản phẩm");
        const item = itemRows[0];
        const totalPrice = parseFloat(item.price || 0);
        const productId = item.product_id;
        const sellerId = item.seller_id;

        // 2. Get currently checked users (before change)
        const [oldStatusRows] = await connection.execute(
            `SELECT user_id FROM house_excel_status WHERE item_id = ? AND is_checked = 1`,
            [itemId]
        );
        const oldParticipants = oldStatusRows.map(r => r.user_id);

        // 3. Predetermine new list of participants
        let newParticipants = [...oldParticipants];
        const targetIdNum = Number(targetUserId);
        if (isChecked) {
            if (!newParticipants.includes(targetIdNum)) newParticipants.push(targetIdNum);
        } else {
            newParticipants = newParticipants.filter(pid => pid !== targetIdNum);
        }

        // 4. Calculate shares
        const oldShare = oldParticipants.length > 0 ? (totalPrice / oldParticipants.length) : 0;
        const newShare = newParticipants.length > 0 ? (totalPrice / newParticipants.length) : 0;

        // 5. Verification: Ensure all participants have enough balance for their NEW share.
        // Formula: CurrentBalance + (WasInOld ? oldShare : 0) >= newShare
        if (newShare > 0) {
            for (const pid of newParticipants) {
                const [wRows] = await connection.execute(`SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE`, [pid]);
                const currentBalance = parseFloat(wRows[0]?.balance || 0);
                const wasInOld = oldParticipants.includes(pid);
                const availableFunds = currentBalance + (wasInOld ? oldShare : 0);
                
                if (availableFunds < newShare && pid !== sellerId) {
                    const [uRows] = await connection.execute(`SELECT full_name FROM users WHERE id = ?`, [pid]);
                    throw new Error(`Người dùng ${uRows[0]?.full_name || pid} không đủ số dư ví (Cần ${newShare.toLocaleString()}đ)`);
                }
            }
        }

        // 6. Financial transactions and Inventory updates
        // A. Refunds and Inventory removal for old group
        for (const pid of oldParticipants) {
            // Financials (only if price > 0)
            if (oldShare > 0) {
                await connection.execute(`UPDATE wallets SET balance = balance + ? WHERE user_id = ?`, [oldShare, pid]);
                await connection.execute(`UPDATE wallets SET balance = balance - ? WHERE user_id = ?`, [oldShare, sellerId]);
                
                await connection.execute(
                    `INSERT INTO transactions (user_id, product_id, house_id, quantity, unit_price, total_price, description, type) 
                     VALUES (?, ?, ?, 1, ?, ?, ?, 'REFUND')`,
                    [pid, productId, houseId, oldShare, oldShare, `Hoàn tiền: Chia lại chi phí ${item.name} (Hủy nhóm ${oldParticipants.length} người)`]
                );
            }

            // Always manage User Inventory
            const [invRows] = await connection.execute(
                `SELECT id, quantity FROM user_inventories WHERE user_id = ? AND product_id = ? FOR UPDATE`,
                [pid, productId]
            );
            if (invRows[0]) {
                if (invRows[0].quantity > 1) {
                    await connection.execute(`UPDATE user_inventories SET quantity = quantity - 1 WHERE id = ?`, [invRows[0].id]);
                } else {
                    await connection.execute(`DELETE FROM user_inventories WHERE id = ?`, [invRows[0].id]);
                }
            }
        }

        // B. Charges and Inventory addition for new group
        for (const pid of newParticipants) {
            // Financials (only if price > 0)
            if (newShare > 0) {
                await connection.execute(`UPDATE wallets SET balance = balance - ? WHERE user_id = ?`, [newShare, pid]);
                await connection.execute(`UPDATE wallets SET balance = balance + ? WHERE user_id = ?`, [newShare, sellerId]);

                await connection.execute(
                    `INSERT INTO transactions (user_id, product_id, house_id, quantity, unit_price, total_price, description, type) 
                     VALUES (?, ?, ?, 1, ?, ?, ?, 'PAYMENT')`,
                    [pid, productId, houseId, newShare, newShare, `Góp tiền: ${item.name} (Nhóm ${newParticipants.length} người)`]
                );
            }

            // Always manage User Inventory
            const [invRows] = await connection.execute(
                `SELECT id FROM user_inventories WHERE user_id = ? AND product_id = ? FOR UPDATE`,
                [pid, productId]
            );
            if (invRows[0]) {
                await connection.execute(`UPDATE user_inventories SET quantity = quantity + 1 WHERE id = ?`, [invRows[0].id]);
            } else {
                await connection.execute(
                    `INSERT INTO user_inventories (user_id, product_id, quantity, is_selling) VALUES (?, ?, 1, 0)`,
                    [pid, productId]
                );
            }
        }

        // 7. Update status table
        await connection.execute(
            `INSERT INTO house_excel_status (item_id, user_id, house_id, is_checked) 
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE is_checked = VALUES(is_checked)`,
            [itemId, targetUserId, houseId, isChecked]
        );

        // 8. Log action
        await logAction(
            connection, 
            houseId, 
            userId, 
            isChecked ? 'check' : 'uncheck', 
            item.name, 
            (userId !== Number(targetUserId)) ? targetUserId : null,
            `Mỗi người chia: ${newShare.toLocaleString()}đ (${newParticipants.length} người)`
        );

        await connection.commit();

        // 9. Send Notifications (Off-transaction)
        try {
            const [targetUserRows] = await connection.execute(`SELECT full_name FROM users WHERE id = ?`, [targetUserId]);
            const targetName = targetUserRows[0]?.full_name || "Thành viên";
            const [houseRows] = await connection.execute(`SELECT name FROM houses WHERE id = ?`, [houseId]);
            const houseName = houseRows[0]?.name || "Nhà";

            // A. Notify participants about their NEW share (those in the new group)
            if (newParticipants.length > 0) {
                for (const pid of newParticipants) {
                    await createNotification({
                        userId: pid,
                        houseId: houseId,
                        type: 'EXCEL_SHARE',
                        title: 'Cập nhật chia sẻ chi phí',
                        message: `Chi phí "${item.name}" tại ${houseName} đã được cập nhật. Phần của bạn hiện tại là: ${newShare.toLocaleString()}đ (${newParticipants.length} người).`,
                        data: { itemId, houseId, productId, type: 'payment' }
                    });
                }
            }

            // B. Notify those who were REMOVED (in old but not in new)
            const removedParticipants = oldParticipants.filter(pid => !newParticipants.includes(pid));
            for (const pid of removedParticipants) {
                await createNotification({
                    userId: pid,
                    houseId: houseId,
                    type: 'EXCEL_REFUND',
                    title: 'Hoàn tiền chia sẻ',
                    message: `Bạn đã rời nhóm chia tiền "${item.name}" và được hoàn trả ${oldShare.toLocaleString()}đ.`,
                    data: { itemId, houseId, productId, type: 'refund' }
                });
            }
        } catch (notifErr) {
            console.warn("Notification error (non-critical):", notifErr.message);
        }

        res.json({ success: true, share: newShare });
    } catch (e) {
        if (connection) await connection.rollback();
        console.error("ToggleStatus Error:", e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
};

// --- History ---

export const getHistory = async (req, res) => {
    const { houseId } = req.params;
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(
            `SELECT a.*, u.full_name as user_name, tu.full_name as target_user_name, uh.role
             FROM house_excel_actions a
             JOIN users u ON u.id = a.user_id
             JOIN user_houses uh ON uh.user_id = u.id AND uh.house_id = a.house_id
             LEFT JOIN users tu ON tu.id = a.target_user_id
             WHERE a.house_id = ?
             ORDER BY a.created_at DESC
             LIMIT 100`,
            [houseId]
        );
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch history" });
    }
};
