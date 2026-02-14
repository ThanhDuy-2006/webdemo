import { connectDB } from "../../utils/db.js";

export const getCart = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        
        const [cRows] = await pool.execute(`SELECT id FROM carts WHERE user_id = ?`, [userId]);
        let cartId = cRows[0]?.id;

        if (!cartId) {
             const [newC] = await pool.execute(`INSERT INTO carts (user_id) VALUES (?)`, [userId]);
             cartId = newC.insertId;
        }

        const [items] = await pool.execute(`
            SELECT ci.*, p.name, p.price, p.image_url, p.seller_id, u.full_name as seller_name,
                   h.type as house_type,
                   (SELECT quantity FROM user_inventories ui WHERE ui.product_id = p.id AND ui.user_id = p.seller_id) as remaining_slots
            FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            JOIN users u ON u.id = p.seller_id
            JOIN houses h ON h.id = p.house_id
            WHERE ci.cart_id = ?
        `, [cartId]);
        
        res.json({ cart_id: cartId, items: items });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Get cart failed" });
    }
};

export const addToCart = async (req, res) => {
    const userId = req.user.id;
    const { product_id, qty } = req.body;
    
    if (!product_id || !qty) return res.status(400).json({ error: "Invalid data" });

    try {
        const pool = await connectDB();
        
        // Ensure Cart
        const [cRows] = await pool.execute(`SELECT id FROM carts WHERE user_id = ?`, [userId]);
        let cartId = cRows[0]?.id;
         if (!cartId) {
             const [newC] = await pool.execute(`INSERT INTO carts (user_id) VALUES (?)`, [userId]);
             cartId = newC.insertId;
        }

        // Check Product & Owner
        const [pRows] = await pool.execute(`SELECT seller_id, house_id, price FROM products WHERE id = ?`, [product_id]);
        if (!pRows[0]) return res.status(404).json({ error: "Product not found" });
        const { seller_id, house_id } = pRows[0];

        // Check Membership
        const [mRows] = await pool.execute(
            `SELECT role FROM user_houses WHERE house_id = ? AND user_id = ?`,
            [house_id, userId]
        );
            
        const role = mRows[0]?.role;
        if (!role || role === 'pending') {
            return res.status(403).json({ error: "You must be a member of this House to buy items." });
        }

        // Check Inventory
        const [inv] = await pool.execute(
            `SELECT quantity FROM user_inventories WHERE user_id = ? AND product_id = ? AND is_selling = 1`,
            [seller_id, product_id]
        );
            
        const stock = inv[0]?.quantity || 0;
        if (stock < qty) return res.status(400).json({ error: "Not enough stock" });

        // Upsert Item
        const [exist] = await pool.execute(
            `SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ?`,
            [cartId, product_id]
        );
            
        if (exist[0]) {
            await pool.execute(
                `UPDATE cart_items SET quantity = quantity + ? WHERE cart_id = ? AND product_id = ?`,
                [qty, cartId, product_id]
            );
        } else {
             await pool.execute(
                `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)`,
                [cartId, product_id, qty]
            );
        }

        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Add to cart failed" });
    }
};

export const removeFromCart = async (req, res) => {
    const userId = req.user.id;
    const { product_id } = req.body;
    
    try {
        const pool = await connectDB();
        const [cRows] = await pool.execute(`SELECT id FROM carts WHERE user_id = ?`, [userId]);
        let cartId = cRows[0]?.id;
        
        if (cartId) {
             await pool.execute(`DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?`, [cartId, product_id]);
        }
        res.json({ ok: true });
    } catch(e) {
        res.status(500).json({ error: "Remove failed" });
    }
};

