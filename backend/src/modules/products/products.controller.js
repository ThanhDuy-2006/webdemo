import { connectDB } from "../../utils/db.js";
import xlsx from "xlsx";
import fs from "fs";
import { createNotification } from "../notifications/notifications.service.js";
import { deleteLocalFile } from "../../utils/fileHelper.js";
import { emitToUser, emitToHouse } from "../../utils/socket.js";
import logger from "../../utils/logger.js";

// Tạo sản phẩm mới (Mặc định status = pending)
export const createProduct = async (req, res) => {
    let { house_id, name, description, price, image_url, quantity } = req.body || {};
  const userId = req.user.id;

  if (req.file) {
    image_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  }

  if (!house_id || !name || !price) {
      return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const pool = await connectDB();
    
    // Verify Role to auto-approve if owner
    const [mRows] = await pool.execute(`
            SELECT uh.role, h.owner_id 
            FROM user_houses uh 
            JOIN houses h ON h.id = uh.house_id 
            WHERE uh.house_id = ? AND uh.user_id = ?
        `, [house_id, userId]);
        
    if (!mRows[0]) return res.status(403).json({ error: "Not a member of this house" });

    const ownerId = mRows[0].owner_id;
    const isOwner = mRows[0].role === 'owner' || req.user.role === 'admin';
    const status = isOwner ? 'active' : 'pending';

    // Calculate unit price
    const initialQty = quantity ? parseInt(quantity) : 1;
    const unitPrice = initialQty > 0 ? (parseFloat(price) / initialQty) : parseFloat(price);

    const [result] = await pool.execute(`
        INSERT INTO products (house_id, seller_id, name, description, price, unit_price, quantity, image_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [house_id, userId, name, description || "", price, unitPrice, initialQty, image_url || null, status]);

    const productId = result.insertId;

    // Add to Inventory
    await pool.execute(`INSERT INTO user_inventories (user_id, product_id, quantity, is_selling) VALUES (?, ?, ?, 1)`, [userId, productId, initialQty]);

    // NOTIFICATION: Notify Owner
    if (userId !== ownerId) {
        await createNotification({
            userId: ownerId,
            houseId: house_id,
            type: 'PRODUCT_APPROVAL_REQUEST',
            title: 'Yêu cầu duyệt sản phẩm',
            message: `${req.user.full_name || 'Thành viên'} đã đăng sản phẩm mới: ${name}`,
            data: { productId: productId }
        });

        // Emit Realtime to House Owner
        emitToUser(ownerId, "newNotification", {
            message: `${req.user.full_name || 'Thành viên'} đã đăng sản phẩm mới: ${name}`,
            type: 'PRODUCT_APPROVAL_REQUEST'
        });
    }

    if (status === 'active') {
        emitToHouse(house_id, "productUpdated", { productId, newQuantity: initialQty });
    }

    const [newRows] = await pool.execute(`SELECT * FROM products WHERE id = ?`, [productId]);
    res.json(newRows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Create product failed" });
  }
};

// Lấy danh sách sản phẩm trong Nhà
export const getProducts = async (req, res) => {
    const { house_id, status, seller_id, q, date } = req.query;
    if (!house_id) return res.status(400).json({ error: "Missing house_id" });

    try {
        const pool = await connectDB();
        let query = `
            SELECT p.*, u.full_name as owner_name
            FROM products p
            LEFT JOIN users u ON u.id = p.seller_id
            WHERE p.house_id = ?
        `;
        let params = [house_id];

        if (status) {
            query += ` AND p.status = ?`;
            params.push(status);
        } else {
            query += ` AND p.status = 'active'`;
        }

        if (q) {
            query += ` AND (p.name LIKE ? OR u.full_name LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }

        if (seller_id) {
            query += ` AND p.seller_id = ?`;
            params.push(seller_id);
        }

        if (date) {
            query += ` AND DATE(p.created_at) = ?`;
            params.push(date);
        }
        
        query += ` ORDER BY p.created_at DESC`;

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to get products" });
    }
};

// Duyệt sản phẩm (Chỉ House Owner)
export const updateProductStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // active, rejected
    const userId = req.user.id;

    if (!['active', 'rejected'].includes(status)) return res.status(400).json({ error: "Invalid status" });

    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Get product to check house
        const [pRows] = await connection.execute(`SELECT house_id, seller_id, name FROM products WHERE id = ?`, [id]);
                                  
        if (!pRows[0]) {
            await connection.rollback();
            return res.status(404).json({ error: "Product not found" });
        }
        const product = pRows[0];
        const houseId = product.house_id;

        if (req.user.role !== 'admin') {
            const [mRows] = await connection.execute(
                `SELECT role FROM user_houses WHERE house_id = ? AND user_id = ?`,
                [houseId, userId]
            );
                                   
            if (mRows[0]?.role !== 'owner') {
                 await connection.rollback();
                 return res.status(403).json({ error: "House Owner only" });
            }
        }

        await connection.execute(`UPDATE products SET status = ? WHERE id = ?`, [status, id]);
        await connection.commit();

        // NOTIFICATION: Notify Seller
        await createNotification({
            userId: product.seller_id,
            houseId: houseId,
            type: status === 'active' ? 'PRODUCT_APPROVED' : 'PRODUCT_REJECTED',
            title: status === 'active' ? 'Sản phẩm được duyệt' : 'Sản phẩm bị từ chối',
            message: `Sản phẩm '${product.name}' của bạn đã ${status === 'active' ? 'được duyệt' : 'bị từ chối'}.`,
            data: { productId: id }
        });

        // Emit Realtime NOTIFICATION
        emitToUser(product.seller_id, "newNotification", {
            message: `Sản phẩm '${product.name}' của bạn đã ${status === 'active' ? 'được duyệt' : 'bị từ chối'}.`,
            type: status === 'active' ? 'PRODUCT_APPROVED' : 'PRODUCT_REJECTED'
        });

        // If approved, notify house room
        if (status === 'active') {
             const [pRows] = await pool.execute("SELECT quantity FROM products WHERE id = ?", [id]);
             emitToHouse(houseId, "productUpdated", { productId: id, newQuantity: pRows[0]?.quantity });
        }

        const [resultRows] = await pool.execute(`SELECT * FROM products WHERE id = ?`, [id]);
        res.json(resultRows[0]);
    } catch (e) {
        if (connection) await connection.rollback();
        console.error(e);
        res.status(500).json({ error: "Update failed" });
    } finally {
        if (connection) connection.release();
    }
};

export const bulkUpdateStatus = async (req, res) => {
    const { productIds, status } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(productIds) || productIds.length === 0) return res.status(400).json({ error: "No products selected" });
    if (!['active', 'rejected'].includes(status)) return res.status(400).json({ error: "Invalid status" });

    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Security check for IDs
        if (!productIds.every(id => Number.isInteger(id))) {
             await connection.rollback();
             return res.status(400).json({ error: "Invalid IDs" });
        }
        
        const placeholders = productIds.map(() => '?').join(',');

        if (req.user.role !== 'admin') {
            const [houses] = await connection.execute(`SELECT DISTINCT house_id FROM products WHERE id IN (${placeholders})`, productIds);
            
            for (const row of houses) {
                const [mRows] = await connection.execute(
                    `SELECT role FROM user_houses WHERE house_id = ? AND user_id = ?`,
                    [row.house_id, userId]
                );
                
                if (mRows[0]?.role !== 'owner') {
                    await connection.rollback();
                    return res.status(403).json({ error: `Not owner of house ${row.house_id}` });
                }
            }
        }

        await connection.execute(`UPDATE products SET status = ? WHERE id IN (${placeholders})`, [status, ...productIds]);
        await connection.commit();
        res.json({ ok: true, count: productIds.length });
    } catch (e) {
        if (connection) await connection.rollback();
        console.error(e);
        res.status(500).json({ error: "Bulk update failed" });
    } finally {
        if (connection) connection.release();
    }
};

export const importProducts = async (req, res) => {
    let { house_id } = req.body;
    if (!house_id) house_id = req.query.house_id;
    const userId = req.user.id;
    const files = req.files || [];
    const excelFile = files.find(f => f.originalname.match(/\.(xlsx|xls)$/i));
    
    const imageMap = {};
    files.forEach(f => {
        if (f.mimetype.startsWith('image/')) {
            const url = `${req.protocol}://${req.get('host')}/uploads/${f.filename}`;
            imageMap[f.originalname] = url;
            imageMap[f.originalname.toLowerCase()] = url;
        }
    });

    if (!house_id || !excelFile) return res.status(400).json({ error: "Missing file or house_id" });

    let connection;
    try {
        const pool = await connectDB();
        
        const [mRows] = await pool.execute(`
            SELECT uh.role, h.type 
            FROM user_houses uh 
            JOIN houses h ON h.id = uh.house_id
            WHERE uh.house_id = ? AND uh.user_id = ?
        `, [house_id, userId]);
        
        if (!mRows[0]) return res.status(403).json({ error: "Not a member" });
        const { role: userRole, type: houseType } = mRows[0];

        const workbook = xlsx.read(fs.readFileSync(excelFile.path), { type: "buffer" });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            return res.status(400).json({ error: "Excel file has no sheets" });
        }
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) return res.status(400).json({ error: "Sheet is empty or missing" });

        const data = xlsx.utils.sheet_to_json(firstSheet);
        if (data.length === 0) return res.json({ ok: false, message: "Empty file (no rows found)" });

        connection = await pool.getConnection();
        await connection.beginTransaction();

        let count = 0;
        let missingImages = [];

        for (const row of data) {
            const cleanRow = {};
            Object.keys(row).forEach(k => { if(k) cleanRow[k.trim()] = row[k]; });

            const name = cleanRow['Name'] || cleanRow['name'] || cleanRow['Tên'];
            let rawPrice = cleanRow['Price'] || cleanRow['price'] || cleanRow['Giá'];
            const desc = cleanRow['Description'] || cleanRow['description'] || cleanRow['Mô tả'] || "";
            let imgRaw = cleanRow['Image'] || cleanRow['image'] || cleanRow['Hình ảnh'] || null;
            let img = null;

            // Parse Price robustly (handle VND formats like 50.000 or 50,000)
            let price = 0;
            if (rawPrice !== undefined && rawPrice !== null) {
                if (typeof rawPrice === 'string') {
                    // Remove all dots and commas for integer prices (common in VND)
                    price = parseFloat(rawPrice.replace(/[.,]/g, '').replace(/[^\d]/g, '')) || 0;
                } else {
                    price = parseFloat(rawPrice) || 0;
                }
            }

            if (imgRaw && typeof imgRaw === 'string') {
                imgRaw = imgRaw.trim();
                if (imageMap[imgRaw]) img = imageMap[imgRaw];
                else {
                    const match = Object.keys(imageMap).find(k => k.toLowerCase().startsWith(imgRaw.toLowerCase() + '.'));
                    img = match ? imageMap[match] : (imgRaw.startsWith('http') ? imgRaw : null);
                    if (!img && !imgRaw.startsWith('http')) missingImages.push(imgRaw);
                }
            }

            let rawQty = cleanRow['Quantity'] || cleanRow['quantity'] || cleanRow['Qty'] || cleanRow['qty'] || cleanRow['Số lượng'] || 1;
            let quantity = parseInt(String(rawQty).replace(/\D/g, '')) || 1;

            // Food House Logic: Price in Excel is TOTAL, convert to UNIT PRICE
            if (houseType === 'food' && quantity > 1 && price > 0) {
                price = Math.ceil(price / quantity);
            }

            if (name && (price !== undefined)) {
                const status = (userRole === 'owner' || userRole === 'admin') ? 'active' : 'pending';
                const unitPrice = quantity > 0 ? (price / quantity) : price;

                const [pRes] = await connection.execute(
                    `INSERT INTO products (house_id, seller_id, name, description, price, unit_price, quantity, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [house_id, userId, name, desc, price, unitPrice, quantity, img, status]
                );
                
                const productId = pRes.insertId;
                await connection.execute(
                    `INSERT INTO user_inventories (user_id, product_id, quantity, is_selling) VALUES (?, ?, ?, 1)`,
                    [userId, productId, quantity]
                );

                // CROSS-SYNC: If House is EXCEL type, add to house_excel_items
                if (houseType === 'excel') {
                    await connection.execute(
                        `INSERT INTO house_excel_items (house_id, name, price, quantity, product_id) VALUES (?, ?, ?, ?, ?)`,
                        [house_id, name, price, quantity, productId]
                    );
                }

                count++;
            }
        }

        await connection.commit();
        try { fs.unlinkSync(excelFile.path); } catch(e){}

        let msg = `Thành công ${count} sản phẩm.`;
        if (missingImages.length > 0) msg += ` Thiếu ${missingImages.length} ảnh.`;
        res.json({ ok: true, count, message: msg });

    } catch (e) {
        if (connection) await connection.rollback();
        console.error("IMPORT ERROR:", e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
};


// Lấy tất cả bài đăng của User (bao gồm hàng đang bán và hàng trong kho)
export const getMyListings = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        // Query products where I am seller OR I have in inventory
        const [rows] = await pool.execute(`
            SELECT DISTINCT 
                p.*, 
                h.name as house_name,
                CASE WHEN p.seller_id = ? THEN 'selling' ELSE 'inventory' END as source_type,
                IFNULL(ui.quantity, 0) as inventory_qty
            FROM products p
            JOIN houses h ON h.id = p.house_id
            LEFT JOIN user_inventories ui ON ui.product_id = p.id AND ui.user_id = ?
            WHERE (p.seller_id = ? OR ui.user_id = ?) 
              AND p.status != 'deleted'
            ORDER BY p.created_at DESC
        `, [userId, userId, userId, userId]);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to get my listings" });
    }
};

// Lấy danh sách sản phẩm trong Thùng rác của User (bao gồm bài đăng và vật phẩm kho)
export const getTrashProducts = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        
        // 1. Lấy bài đăng đã xóa (Listings)
        // Owner of the house should also see deleted products of their house
        const [listings] = await pool.execute(`
            SELECT p.*, h.name as house_name, u.full_name as seller_name, 'listing' as trash_type
            FROM products p
            LEFT JOIN houses h ON h.id = p.house_id
            JOIN users u ON u.id = p.seller_id
            WHERE (p.seller_id = ? OR h.owner_id = ?) AND p.status = 'deleted'
        `, [userId, userId]);

        // 2. Lấy vật phẩm kho đã xóa (Inventory Items)
        const [inventories] = await pool.execute(`
            SELECT ui.*, p.name, p.description, p.image_url, h.name as house_name, u.full_name as seller_name, 'inventory' as trash_type
            FROM user_inventories ui
            JOIN products p ON p.id = ui.product_id
            JOIN users u ON u.id = p.seller_id
            LEFT JOIN houses h ON h.id = p.house_id
            WHERE ui.user_id = ? AND ui.deleted_at IS NOT NULL
        `, [userId]);

        // 3. Lấy Nhà đã xóa (Houses)
        const [houses] = await pool.execute(`
            SELECT h.*, h.name, 'house' as trash_type, u.full_name as seller_name
            FROM houses h
            JOIN users u ON u.id = h.owner_id
            WHERE h.owner_id = ? AND h.status = 'deleted'
        `, [userId]);

        const combined = [...listings, ...inventories, ...houses].sort((a, b) => 
            new Date(b.deleted_at) - new Date(a.deleted_at)
        );

        res.json(combined);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to get trash items" });
    }
};

// Khôi phục sản phẩm từ Thùng rác
export const restoreProduct = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const pool = await connectDB();
        const [pRows] = await pool.execute(`SELECT seller_id, previous_status FROM products WHERE id = ?`, [id]);
        
        if (!pRows[0]) return res.status(404).json({ error: "Sản phẩm không tồn tại" });
        if (req.user.role !== 'admin' && pRows[0].seller_id !== userId) {
            return res.status(403).json({ error: "Bạn không có quyền khôi phục sản phẩm này" });
        }

        const restoreStatus = pRows[0].previous_status || 'active';
        await pool.execute(
            `UPDATE products SET status = ?, previous_status = NULL, deleted_at = NULL WHERE id = ?`,
            [restoreStatus, id]
        );

        // SYNC: Also restore associated inventories (if they were deleted at the same time)
        // We only restore inventories owned by the seller or admin
        await pool.execute(
            `UPDATE user_inventories SET deleted_at = NULL WHERE product_id = ? AND deleted_at IS NOT NULL`,
            [id]
        );

        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Khôi phục thất bại" });
    }
};

// Xóa vĩnh viễn (Force Delete)
export const forceDeleteProduct = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [pRows] = await connection.execute(`SELECT seller_id, image_url FROM products WHERE id = ?`, [id]);
        if (!pRows[0]) {
            await connection.rollback();
            return res.status(404).json({ error: "Sản phẩm không tồn tại" });
        }

        if (req.user.role !== 'admin' && pRows[0].seller_id !== userId) {
            await connection.rollback();
            return res.status(403).json({ error: "Bạn không có quyền xóa sản phẩm này" });
        }

        if (pRows[0].image_url) deleteLocalFile(pRows[0].image_url);

        await connection.execute(`DELETE FROM user_inventories WHERE product_id = ?`, [id]);
        await connection.execute(`DELETE FROM products WHERE id = ?`, [id]);

        await connection.commit();
        res.json({ ok: true });
    } catch (e) {
        if (connection) await connection.rollback();
        console.error(e);
        res.status(500).json({ error: "Xóa vĩnh viễn thất bại" });
    } finally {
        if (connection) connection.release();
    }
};


export const deleteProduct = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const pool = await connectDB();
        const [pRows] = await pool.execute(`
            SELECT p.seller_id, p.house_id, h.owner_id, p.status 
            FROM products p 
            JOIN houses h ON p.house_id = h.id 
            WHERE p.id = ?
        `, [id]);

        if (!pRows[0]) {
            return res.status(404).json({ error: "Sản phẩm không tồn tại" });
        }
        
        const product = pRows[0];
        if (req.user.role !== 'admin' && product.seller_id !== userId && product.owner_id !== userId) {
             return res.status(403).json({ error: "Bạn không có quyền xóa sản phẩm này" });
        }

        // Soft Delete: Move to trash
        await pool.execute(
            `UPDATE products SET status = 'deleted', previous_status = ?, deleted_at = NOW() WHERE id = ?`,
            [product.status, id]
        );
        
        // SYNC: Also mark associated inventories as deleted
        await pool.execute(
            `UPDATE user_inventories SET deleted_at = NOW() WHERE product_id = ? AND deleted_at IS NULL`,
            [id]
        );

        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Chuyển vào thùng rác thất bại" });
    }
};

export const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, price, quantity, description } = req.body;
    const userId = req.user.id;

    let connection;
    try {
        const pool = await connectDB();
        const [pRows] = await pool.execute(`
            SELECT seller_id, house_id, status FROM products WHERE id = ?
        `, [id]);

        if (!pRows[0]) return res.status(404).json({ error: "Sản phẩm không tồn tại" });
        const product = pRows[0];

        // Permission: Only seller or admin can edit
        if (req.user.role !== 'admin' && product.seller_id !== userId) {
            return res.status(403).json({ error: "Bạn không có quyền sửa sản phẩm này" });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const unitPrice = (quantity > 0) ? (price / quantity) : price;

        // 1. Update Product
        await connection.execute(
            `UPDATE products SET name = ?, price = ?, unit_price = ?, quantity = ?, description = ? WHERE id = ?`,
            [name, price, unitPrice, quantity, description, id]
        );

        // 2. Sync Inventory (for the seller)
        await connection.execute(
            `UPDATE user_inventories SET quantity = ? WHERE product_id = ? AND user_id = ?`,
            [quantity, id, product.seller_id]
        );

        // 3. Sync Excel Item (if exists)
        await connection.execute(
            `UPDATE house_excel_items SET name = ?, price = ?, quantity = ? WHERE product_id = ?`,
            [name, price, quantity, id]
        );

        await connection.commit();
        res.json({ ok: true });
    } catch (e) {
        if (connection) await connection.rollback();
        console.error(e);
        res.status(500).json({ error: "Cập nhật sản phẩm thất bại: " + e.message });
    } finally {
        if (connection) connection.release();
    }
};
export const bulkDelete = async (req, res) => {
    const { productIds } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: "Chưa chọn sản phẩm nào" });
    }

    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const placeholders = productIds.map(() => '?').join(',');
        
        // Fetch products to check permissions
        const [rows] = await connection.execute(`
            SELECT p.id, p.seller_id, p.status, h.owner_id 
            FROM products p
            JOIN houses h ON p.house_id = h.id
            WHERE p.id IN (${placeholders})
        `, productIds);

        const deletableProducts = rows.filter(p => isAdmin || p.seller_id === userId || p.owner_id === userId);
        
        if (deletableProducts.length === 0) {
            await connection.rollback();
            return res.status(403).json({ error: "Bạn không có quyền xóa các sản phẩm này" });
        }

        for (const p of deletableProducts) {
            await connection.execute(
                `UPDATE products SET status = 'deleted', previous_status = ?, deleted_at = NOW() WHERE id = ?`,
                [p.status, p.id]
            );
            // SYNC: Also mark associated inventories as deleted
            await connection.execute(
                `UPDATE user_inventories SET deleted_at = NOW() WHERE product_id = ? AND deleted_at IS NULL`,
                [p.id]
            );
        }

        await connection.commit();
        res.json({ ok: true, count: deletableProducts.length });
    } catch (e) {
        if (connection) await connection.rollback();
        console.error(e);
        res.status(500).json({ error: "Chuyển vào thùng rác thất bại" });
    } finally {
        if (connection) connection.release();
    }
};

export const bulkRestore = async (req, res) => {
    const { productIds } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: "Chưa chọn sản phẩm nào" });
    }

    try {
        const pool = await connectDB();
        const placeholders = productIds.map(() => '?').join(',');
        
        const [rows] = await pool.execute(
            `SELECT id, seller_id, previous_status FROM products WHERE id IN (${placeholders})`,
            productIds
        );

        const restorable = rows.filter(p => isAdmin || p.seller_id === userId);
        
        for (const p of restorable) {
            const restoreStatus = p.previous_status || 'active';
            await pool.execute(
                `UPDATE products SET status = ?, previous_status = NULL, deleted_at = NULL WHERE id = ?`,
                [restoreStatus, p.id]
            );
            // SYNC: Also restore associated inventories
            await pool.execute(
                `UPDATE user_inventories SET deleted_at = NULL WHERE product_id = ? AND deleted_at IS NOT NULL`,
                [p.id]
            );
        }

        res.json({ ok: true, count: restorable.length });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Khôi phục hàng loạt thất bại" });
    }
};

export const bulkForceDelete = async (req, res) => {
    const { productIds } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: "Chưa chọn sản phẩm nào" });
    }

    let connection;
    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const placeholders = productIds.map(() => '?').join(',');
        const [rows] = await connection.execute(
            `SELECT id, seller_id, image_url FROM products WHERE id IN (${placeholders})`,
            productIds
        );

        const deletable = rows.filter(p => isAdmin || p.seller_id === userId);
        
        for (const p of deletable) {
            if (p.image_url) deleteLocalFile(p.image_url);
            await connection.execute(`DELETE FROM user_inventories WHERE product_id = ?`, [p.id]);
            await connection.execute(`DELETE FROM products WHERE id = ?`, [p.id]);
        }

        await connection.commit();
        res.json({ ok: true, count: deletable.length });
    } catch (e) {
        if (connection) await connection.rollback();
        console.error(e);
        res.status(500).json({ error: "Xóa vĩnh viễn hàng loạt thất bại" });
    } finally {
        if (connection) connection.release();
    }
};

// --- WALLET BUYING LOGIC ---
export const buyProduct = async (req, res) => {
    const { id } = req.params;
    const buyerId = req.user.id;
    let connection;

    try {
        const pool = await connectDB();
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Lock Product and Check Stock (SELECT ... FOR UPDATE)
        const [pRows] = await connection.execute(
            `SELECT p.*, h.owner_id FROM products p JOIN houses h ON h.id = p.house_id WHERE p.id = ? FOR UPDATE`,
            [id]
        );

        if (!pRows[0]) throw new Error("Sản phẩm không tồn tại");
        const product = pRows[0];

        if (product.status !== 'active') throw new Error("Sản phẩm chưa được duyệt hoặc đã bị xóa");
        if (product.quantity <= 0) throw new Error("Sản phẩm đã hết hàng");

        // 2. Lock Wallet and Check Balance
        const [wRows] = await connection.execute(
            `SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE`,
            [buyerId]
        );

        if (!wRows[0]) throw new Error("Ví người dùng không tồn tại");
        const balance = parseFloat(wRows[0].balance);
        
        const unitPrice = (product.unit_price && parseFloat(product.unit_price) > 0)
            ? parseFloat(product.unit_price)
            : (product.quantity > 0 ? parseFloat(product.price) / product.quantity : parseFloat(product.price));

        if (balance < unitPrice) throw new Error("Số dư ví không đủ để thanh toán");

        // 3. EXECUTE TRANSACTION
        await connection.execute(`UPDATE products SET quantity = quantity - 1 WHERE id = ?`, [id]);

        const [sellerInv] = await connection.execute(
            `SELECT id, quantity FROM user_inventories WHERE user_id = ? AND product_id = ? FOR UPDATE`,
            [product.seller_id, id]
        );
        if (sellerInv[0]) {
            if (sellerInv[0].quantity > 1) {
                await connection.execute(`UPDATE user_inventories SET quantity = quantity - 1 WHERE id = ?`, [sellerInv[0].id]);
            } else {
                await connection.execute(`DELETE FROM user_inventories WHERE id = ?`, [sellerInv[0].id]);
            }
        }

        await connection.execute(`UPDATE wallets SET balance = balance - ? WHERE user_id = ?`, [unitPrice, buyerId]);
        await connection.execute(`UPDATE wallets SET balance = balance + ? WHERE user_id = ?`, [unitPrice, product.seller_id]);

        await connection.execute(
            `INSERT INTO transactions (user_id, product_id, house_id, quantity, unit_price, total_price, type, description)
             VALUES (?, ?, ?, 1, ?, ?, 'PAYMENT', ?)`,
            [buyerId, id, product.house_id, unitPrice, unitPrice, `Mua: ${product.name}`]
        );

        await connection.execute(
            `INSERT INTO product_sales_log (product_id, buyer_id, action_type)
             VALUES (?, ?, 'BUY')`,
            [id, buyerId]
        );

        // Add to Buyer Inventory
        const [buyerInv] = await connection.execute(
            `SELECT id FROM user_inventories WHERE user_id = ? AND product_id = ?`,
            [buyerId, id]
        );
        if (buyerInv[0]) {
            await connection.execute(`UPDATE user_inventories SET quantity = quantity + 1 WHERE id = ?`, [buyerInv[0].id]);
        } else {
            await connection.execute(`INSERT INTO user_inventories (user_id, product_id, quantity, is_selling) VALUES (?, ?, 1, 0)`, [buyerId, id]);
        }

        await connection.commit();

        // --- REALTIME ---
        const [bWallet] = await pool.execute(`SELECT balance FROM wallets WHERE user_id = ?`, [buyerId]);
        const [sWallet] = await pool.execute(`SELECT balance FROM wallets WHERE user_id = ?`, [product.seller_id]);
        emitToUser(buyerId, "walletUpdated", { newBalance: bWallet[0]?.balance });
        emitToUser(product.seller_id, "walletUpdated", { newBalance: sWallet[0]?.balance });

        const [finalPRows] = await pool.execute(`SELECT quantity FROM products WHERE id = ?`, [id]);
        emitToHouse(product.house_id, "productUpdated", { productId: id, newQuantity: finalPRows[0]?.quantity });

        emitToUser(product.seller_id, "newNotification", {
            message: `Bạn vừa bán được 1 ${product.name}!`,
            type: 'PRODUCT_SOLD'
        });

        res.json({ ok: true, message: "Mua hàng thành công", unitPrice });

    } catch (e) {
        if (connection) await connection.rollback();
        logger.error("BUY ERROR:", e);
        res.status(500).json({ error: e.message || "Mua hàng thất bại" });
    } finally {
        if (connection) connection.release();
    }
};

export const getHouseTransactions = async (req, res) => {
    const { houseId } = req.params;
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(`
            SELECT 
                t.*, 
                u.full_name as buyer_name, 
                s.full_name as seller_name,
                p.name as product_name,
                t.description,
                t.type
            FROM transactions t
            LEFT JOIN users u ON u.id = t.user_id
            LEFT JOIN products p ON p.id = t.product_id
            LEFT JOIN users s ON s.id = p.seller_id
            WHERE t.house_id = ?
            ORDER BY t.created_at DESC
        `, [houseId]);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch transactions" });
    }
};

