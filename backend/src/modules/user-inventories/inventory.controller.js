import { connectDB } from "../../utils/db.js";

export const getMyInventory = async (req, res) => {
    const userId = req.user.id;
    const { house_id } = req.query;

    try {
        const pool = await connectDB();
        let query = `
            SELECT ui.*, p.name, p.price, p.description, p.image_url, u.full_name as seller_name
            FROM user_inventories ui
            JOIN products p ON p.id = ui.product_id
            JOIN users u ON u.id = p.seller_id
            WHERE ui.user_id = ? AND ui.quantity > 0 AND p.status != 'deleted' AND ui.deleted_at IS NULL
        `;
        const params = [userId];

        if (house_id) {
             query += ` AND p.house_id = ?`;
             params.push(house_id);
        }

        const [rows] = await pool.execute(query, params);

        res.json(rows);
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: "Get inventory failed" });
    }
};

export const toggleSelling = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { is_selling } = req.body;

    try {
        const pool = await connectDB();
        
        await pool.execute(
            `UPDATE user_inventories SET is_selling = ? WHERE id = ? AND user_id = ?`,
            [is_selling ? 1 : 0, id, userId]
        );
            
        const [rows] = await pool.execute(`SELECT * FROM user_inventories WHERE id = ?`, [id]);
        if (!rows[0]) return res.status(404).json({ error: "Not found" });
        res.json(rows[0]);
    } catch(e) {
         console.error(e);
         res.status(500).json({ error: "Update failed" });
    }
};

export const resellItem = async (req, res) => {
    const userId = req.user.id;
    const { inventory_id, house_id, price, quantity } = req.body;

    if (!quantity || quantity <= 0) return res.status(400).json({ error: "Invalid quantity" });
    console.log("[ResellDebug] Received:", req.body);

    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Get Source Inventory
        const [inv] = await connection.execute(
            `SELECT ui.*, p.name, p.description, p.image_url 
             FROM user_inventories ui 
             JOIN products p ON p.id = ui.product_id 
             WHERE ui.id = ? AND ui.user_id = ? FOR UPDATE`,
            [inventory_id, userId]
        );

        if (!inv[0]) throw new Error("Item not found or insufficient permission");
        const sourceItem = inv[0];

        if (sourceItem.quantity < quantity) throw new Error("Not enough quantity to resell");

        // 2. Create New Product
        const [pRes] = await connection.execute(
            `INSERT INTO products (house_id, seller_id, name, description, price, image_url, status) VALUES (?, ?, ?, ?, ?, ?, 'active')`,
            [house_id, userId, sourceItem.name, sourceItem.description, price, sourceItem.image_url]
        );
        const newProductId = pRes.insertId;

        // 3. Add to New Inventory (Seller's stock for new product)
        await connection.execute(
            `INSERT INTO user_inventories (user_id, product_id, quantity, is_selling) VALUES (?, ?, ?, 1)`,
            [userId, newProductId, quantity]
        );

        // 4. Deduct Source Inventory
        if (sourceItem.quantity === quantity) {
             await connection.execute(`DELETE FROM user_inventories WHERE id = ?`, [inventory_id]);
        } else {
             await connection.execute(
                 `UPDATE user_inventories SET quantity = quantity - ? WHERE id = ?`, 
                 [quantity, inventory_id]
             );
        }

        await connection.commit();
        res.json({ ok: true, new_product_id: newProductId });

    } catch (e) {
        if (connection) await connection.rollback();
        console.error("Resell Error:", e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
};

export const cancelSell = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Verify Ownership & Selling Status
        const [rows] = await connection.execute(
            `SELECT ui.*, p.id as product_id 
             FROM user_inventories ui
             JOIN products p ON p.id = ui.product_id
             WHERE ui.id = ? AND ui.user_id = ?`,
            [id, userId]
        );

        if (!rows[0]) throw new Error("Item not found");
        const item = rows[0];

        if (item.is_selling !== 1) throw new Error("Item is not currently selling");

        // 2. Turn off Selling in Inventory
        await connection.execute(
            `UPDATE user_inventories SET is_selling = 0 WHERE id = ?`,
            [id]
        );

        // 3. Deactivate Product in Marketplace
        // Only if I am the seller (which I must be if I own the inventory record created for selling)
        await connection.execute(
            `UPDATE products SET status = 'inactive' WHERE id = ? AND seller_id = ?`,
            [item.product_id, userId]
        );

        await connection.commit();
        res.json({ ok: true, message: "Cancel sell success" });
    } catch (e) {
        if (connection) await connection.rollback();
        console.error("Cancel Sell Error:", e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
};

export const updateInventoryItem = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { quantity, price } = req.body; // If price is provided, we update the PRODUCT price?

    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Verify Ownership & Product Link
        const [rows] = await connection.execute(
            `SELECT ui.*, p.seller_id, p.id as product_id 
             FROM user_inventories ui
             JOIN products p ON p.id = ui.product_id
             WHERE ui.id = ? AND ui.user_id = ?`,
            [id, userId]
        );

        if (!rows[0]) throw new Error("Item not found");
        const item = rows[0];

        // 2. Update Quantity
        if (quantity !== undefined) {
             if (quantity <= 0) {
                 await connection.execute(`UPDATE user_inventories SET quantity = 0, deleted_at = NOW() WHERE id = ?`, [id]);
             } else {
                 await connection.execute(`UPDATE user_inventories SET quantity = ?, deleted_at = NULL WHERE id = ?`, [quantity, id]);
             }
        }

        // 3. Update Price (Only if I am the seller/creator of this product)
        if (price !== undefined) {
            if (item.seller_id === userId) {
                await connection.execute(`UPDATE products SET price = ? WHERE id = ?`, [price, item.product_id]);
            } else {
                // If I am not the seller, I cannot change the "official" price.
                // But user wants to match "edit price". 
                // Maybe they meant "Resell price"? 
                // If so, they should use the Resell feature.
                // For now, I'll allow updating price ONLY if they generated this product.
                 console.warn("User tried to update price of product they didn't create. Ignoring.");
            }
        }

        await connection.commit();
        res.json({ ok: true });

    } catch (e) {
        if (connection) await connection.rollback();
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
};

export const deleteInventoryItem = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const pool = await connectDB();
        // Only allow deleting if I own it
        // Soft Delete: Update deleted_at instead of deleting record
        const [result] = await pool.execute(
            "UPDATE user_inventories SET deleted_at = NOW() WHERE id = ? AND user_id = ?",
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Item not found" });
        }

        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Delete failed" });
    }
};

export const bulkDeleteInventories = async (req, res) => {
    const { ids } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No items selected" });
    }

    try {
        const pool = await connectDB();
        const placeholders = ids.map(() => '?').join(',');
        
        let query = `UPDATE user_inventories SET deleted_at = NOW() WHERE id IN (${placeholders})`;
        let params = [...ids];

        if (!isAdmin) {
            query += ` AND user_id = ?`;
            params.push(userId);
        }

        const [result] = await pool.execute(query, params);
        res.json({ ok: true, count: result.affectedRows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Bulk delete failed" });
    }
};

export const bulkRestoreInventories = async (req, res) => {
    const { ids } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No items selected" });
    }

    try {
        const pool = await connectDB();
        const placeholders = ids.map(() => '?').join(',');
        
        let query = `UPDATE user_inventories SET deleted_at = NULL, quantity = GREATEST(quantity, 1) WHERE id IN (${placeholders})`;
        let params = [...ids];

        if (!isAdmin) {
            query += ` AND user_id = ?`;
            params.push(userId);
        }

        const [result] = await pool.execute(query, params);
        res.json({ ok: true, count: result.affectedRows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Bulk restore failed" });
    }
};

export const bulkForceDeleteInventories = async (req, res) => {
    const { ids } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No items selected" });
    }

    try {
        const pool = await connectDB();
        const placeholders = ids.map(() => '?').join(',');
        
        let query = `DELETE FROM user_inventories WHERE id IN (${placeholders})`;
        let params = [...ids];

        if (!isAdmin) {
            query += ` AND user_id = ?`;
            params.push(userId);
        }

        const [result] = await pool.execute(query, params);
        res.json({ ok: true, count: result.affectedRows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Bulk force delete failed" });
    }
};


export const restoreInventoryItem = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const pool = await connectDB();
        const isAdmin = req.user.role === 'admin';

        let query = "UPDATE user_inventories SET deleted_at = NULL, quantity = GREATEST(quantity, 1) WHERE id = ?";
        let params = [id];

        if (!isAdmin) {
            query += " AND user_id = ?";
            params.push(userId);
        }

        const [result] = await pool.execute(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Item not found in trash" });
        }

        res.json({ ok: true, message: "Item restored from trash" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Restore failed" });
    }
};

export const forceDeleteInventoryItem = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const pool = await connectDB();
        const isAdmin = req.user.role === 'admin';

        let query = "DELETE FROM user_inventories WHERE id = ?";
        let params = [id];

        if (!isAdmin) {
            query += " AND user_id = ?";
            params.push(userId);
        }

        const [result] = await pool.execute(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Item not found" });
        }

        res.json({ ok: true, message: "Item permanently deleted" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Force delete failed" });
    }
};
