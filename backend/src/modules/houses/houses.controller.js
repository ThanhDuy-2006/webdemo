import { connectDB } from "../../utils/db.js";
import { createNotification } from "../notifications/notifications.service.js";
import { emitToUser, emitToHouse } from "../../utils/socket.js";

export const createHouse = async (req, res) => {
  const { name, description, type } = req.body || {};
  const ownerId = req.user.id;

  if (!name) return res.status(400).json({ error: "Missing name" });
  
  let connection;
  try {
    const pool = await connectDB();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    let coverImage = req.file ? `/uploads/${req.file.filename}` : null;
    if (!coverImage && req.body.cover_url) {
        coverImage = req.body.cover_url;
    }

    const [hRes] = await connection.execute(
        `INSERT INTO houses (name, description, owner_id, cover_image, type) VALUES (?, ?, ?, ?, ?)`,
        [name, description || "", ownerId, coverImage, type || 'community']
    );
    
    const houseId = hRes.insertId;

    await connection.execute(
        `INSERT INTO user_houses (user_id, house_id, role, joined_at) VALUES (?, ?, 'owner', CURRENT_TIMESTAMP)`,
        [ownerId, houseId]
    );

    await connection.commit();

    const [rows] = await pool.execute(`SELECT * FROM houses WHERE id = ?`, [houseId]);
    res.json(rows[0]);
  } catch (e) {
    if (connection) await connection.rollback();
    console.error(e);
    res.status(500).json({ error: "Create house failed" });
  } finally {
    if (connection) connection.release();
  }
};

export const getHouses = async (req, res) => {
    const { scope } = req.query;
    
    // Handle 'joined' scope (Authenticated)
    if (scope === 'joined') {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        return getMyJoinedHouses(req, res);
    }

    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(`
            SELECT 
                h.*, 
                u.full_name as owner_name,
                (SELECT COUNT(*) FROM user_houses uh WHERE uh.house_id = h.id) as member_count,
                (SELECT COUNT(*) FROM products p WHERE p.house_id = h.id) as product_count
            FROM houses h 
            LEFT JOIN users u ON h.owner_id = u.id 
            ORDER BY h.created_at DESC
        `);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Get houses failed" });
    }
};

const getMyJoinedHouses = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(`
            SELECT h.*, uh.role 
            FROM houses h
            JOIN user_houses uh ON h.id = uh.house_id
            WHERE uh.user_id = ? AND uh.role != 'pending'
            ORDER BY h.created_at DESC
        `, [userId]);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Get joined houses failed" });
    }
};

export const getHouseDetail = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(
            `SELECT h.*, u.full_name as owner_name, h.cover_position
             FROM houses h 
             LEFT JOIN users u ON h.owner_id = u.id 
             WHERE h.id = ?`,
            [id]
        );
            
        if (!rows[0]) return res.status(404).json({ error: "House not found" });
        res.json(rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Get detail failed" });
    }
};

export const createMembership = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        
        const [hRows] = await pool.execute(`SELECT id, owner_id, name FROM houses WHERE id = ?`, [id]);
        if (!hRows[0]) return res.status(404).json({ error: "House not found" });
        const houseData = hRows[0];

        const [mRows] = await pool.execute(
            `SELECT id, role FROM user_houses WHERE house_id = ? AND user_id = ?`,
            [id, userId]
        );
            
        if (mRows[0]) {
             if (mRows[0].role === 'pending') return res.status(400).json({ error: "Request already pending" });
             return res.status(400).json({ error: "Already member" });
        }

        await pool.execute(
            `INSERT INTO user_houses (house_id, user_id, role, joined_at) VALUES (?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [id, userId]
        );
            
        await createNotification({
            userId: houseData.owner_id,
            houseId: id,
            type: 'HOUSE_JOIN_REQUEST',
            title: 'Yêu cầu tham gia nhà',
            message: `${req.user.full_name || 'Thành viên'} muốn tham gia nhà "${houseData.name}" của bạn.`,
            data: { userId: userId }
        });

        // Emit Realtime Event to Owner
        emitToUser(houseData.owner_id, "newNotification", {
            message: `${req.user.full_name || 'Thành viên'} muốn tham gia nhà "${houseData.name}" của bạn.`,
            type: 'HOUSE_JOIN_REQUEST'
        });

        res.json({ ok: true, message: "Request sent. Waiting for approval." });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: "Join failed" });
    }
};

export const getMembership = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(
            `SELECT role FROM user_houses WHERE house_id = ? AND user_id = ?`,
            [id, userId]
        );
            
        res.json({ role: rows[0]?.role || null });
    } catch (e) {
         console.error(e);
         res.status(500).json({ error: "Get role failed" });
    }
};

export const getMembers = async (req, res) => {
    const { id } = req.params;
    const { status } = req.query; // pending, member
    try {
        const pool = await connectDB();
        let query = `
            SELECT u.id, u.full_name, u.email, uh.role, uh.joined_at
            FROM user_houses uh
            JOIN users u ON u.id = uh.user_id
            WHERE uh.house_id = ?
        `;
        
        let params = [id];

        if (status) {
            query += ` AND uh.role = ?`;
            params.push(status);
        }

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Get members failed" });
    }
};

export const updateMemberStatus = async (req, res) => {
    const { id, userId } = req.params; // house id, user id
    const { status } = req.body; // member, rejected
    const ownerId = req.user.id; // Keep this for owner check if needed

    try {
        const pool = await connectDB();
        
        // Check owner or admin (original logic)
        if (req.user.role !== 'admin') {
            const [ownerCheckRows] = await pool.execute(
                `SELECT role FROM user_houses WHERE house_id = ? AND user_id = ?`,
                [id, ownerId]
            );
                
            if (ownerCheckRows[0]?.role !== 'owner') return res.status(403).json({ error: "Owner only" });
        }

        const [hResRows] = await pool.execute(`SELECT name FROM houses WHERE id = ?`, [id]);
        const houseName = hResRows[0]?.name || "nhà";

        if (status === 'rejected') {
            await pool.execute(`DELETE FROM user_houses WHERE house_id = ? AND user_id = ?`, [id, userId]);

            // NOTIFICATION: Notify User (Rejection)
            await createNotification({
                userId: userId,
                houseId: id,
                type: 'HOUSE_JOIN_REJECTED',
                title: 'Yêu cầu tham gia bị từ chối',
                message: `Yêu cầu tham gia nhà "${houseName}" của bạn đã bị từ chối.`,
                data: { houseId: id }
            });

            // Emit Realtime Event to User
            emitToUser(userId, "newNotification", {
                message: `Yêu cầu tham gia nhà "${houseName}" của bạn đã bị từ chối.`,
                type: 'HOUSE_JOIN_REJECTED'
            });

            return res.json({ message: "Rejected (Removed)" });
        }

        if (status === 'member') {
            await pool.execute(
                `UPDATE user_houses SET role = 'member' WHERE house_id = ? AND user_id = ?`,
                [id, userId]
            );
            
            // NOTIFICATION: Notify User
            await createNotification({
                userId: userId,
                houseId: id,
                type: 'HOUSE_JOIN_APPROVED',
                title: 'Yêu cầu tham gia được chấp nhận',
                message: `Yêu cầu tham gia nhà "${houseName}" của bạn đã được chấp nhận.`,
                data: { houseId: id }
            });

            // Emit Realtime Event to User
            emitToUser(userId, "newNotification", {
                message: `Yêu cầu tham gia nhà "${houseName}" của bạn đã được chấp nhận.`,
                type: 'HOUSE_JOIN_APPROVED'
            });

            return res.json({ message: "Approved" });
        }

        res.status(400).json({ error: "Invalid status" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Update member failed" });
    }
};


import { deleteLocalFile } from "../../utils/fileHelper.js"; // Added import

// ... (previous code)

export const updateHouseCover = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check for file or URL
    let coverImage = req.file ? `/uploads/${req.file.filename}` : null;
    if (!coverImage && req.body.cover_url) {
        coverImage = req.body.cover_url;
    }

    if (!coverImage) return res.status(400).json({ error: "No image provided" });

    try {
        const pool = await connectDB();

        // Verify Owner/Admin & Get Old Cover
        const [houseRows] = await pool.execute(
            `SELECT h.cover_image, uh.role 
             FROM houses h 
             LEFT JOIN user_houses uh ON h.id = uh.house_id AND uh.user_id = ?
             WHERE h.id = ?`,
            [userId, id]
        );
        
        const house = houseRows[0];
        if (!house) return res.status(404).json({ error: "House not found" });

        if (req.user.role !== 'admin' && house.role !== 'owner') {
            return res.status(403).json({ error: "Unauthorized" });
        }
        
        // Delete old cover if exists
        if (house.cover_image) deleteLocalFile(house.cover_image);

        await pool.execute(
            "UPDATE houses SET cover_image = ?, cover_position='center' WHERE id = ?",
            [coverImage, id]
        );

        res.json({ success: true, cover_image: coverImage });

        // Emit House Update to Room
        emitToHouse(id, "houseUpdated", { cover_image: coverImage });
    } catch (e) {
        console.error("Update cover failed:", e);
        res.status(500).json({ error: "Update failed" });
    }
};



export const updateHouseCoverPosition = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { cover_position } = req.body;
    
    if (!cover_position) return res.status(400).json({ error: "No position provided" });

    try {
        const pool = await connectDB();
        
        // Verify Owner/Admin
        if (req.user.role !== 'admin') {
            const [rows] = await pool.execute(
                `SELECT role FROM user_houses WHERE house_id = ? AND user_id = ?`,
                [id, userId]
            );
            
            if (rows[0]?.role !== 'owner') return res.status(403).json({ error: "Unauthorized" });
        }

        await pool.execute("UPDATE houses SET cover_position = ? WHERE id = ?", [cover_position, id]);
        
        res.json({ success: true, message: "Position updated" });

        // Emit House Update to Room
        emitToHouse(id, "houseUpdated", { cover_position });
    } catch (e) {
         console.error(e);
         return res.status(500).json({ error: "Update pos failed" });
    }
};

export const deleteHouseCover = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
        const pool = await connectDB();

        // Verify Owner/Admin & Get Old Cover
        const [houseRows] = await pool.execute(
            `SELECT h.cover_image, uh.role 
             FROM houses h 
             LEFT JOIN user_houses uh ON h.id = uh.house_id AND uh.user_id = ?
             WHERE h.id = ?`,
            [userId, id]
        );

        const house = houseRows[0];
        if (!house) return res.status(404).json({ error: "House not found" });

        if (req.user.role !== 'admin' && house.role !== 'owner') {
             return res.status(403).json({ error: "Unauthorized" });
        }

        // Delete old cover file
        if (house.cover_image) deleteLocalFile(house.cover_image);

        await pool.execute("UPDATE houses SET cover_image = NULL WHERE id = ?", [id]);

        res.json({ success: true, message: "Cover image removed" });
    } catch (e) {
        console.error("Delete cover failed:", e);
        res.status(500).json({ error: "Delete failed" });
    }
};

export const deleteHouse = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
        const pool = await connectDB();
        
        // 1. Verify Owner/Admin
        const [houseRows] = await pool.execute(
            `SELECT h.id, h.owner_id FROM houses h WHERE h.id = ? AND h.status != 'deleted'`,
            [id]
        );

        const house = houseRows[0];
        if (!house) return res.status(404).json({ error: "House not found" });

        if (req.user.role !== 'admin' && house.owner_id !== userId) {
             return res.status(403).json({ error: "Bạn không có quyền xóa nhà này." });
        }

        // 2. Soft Delete: Move to trash
        await pool.execute(
            `UPDATE houses SET status = 'deleted', deleted_at = NOW() WHERE id = ?`,
            [id]
        );

        res.json({ success: true, message: "Đã chuyển nhà vào thùng rác" });
    } catch (e) {
        console.error("Soft delete house failed:", e);
        res.status(500).json({ error: "Lỗi khi xóa nhà: " + e.message });
    }
};

export const restoreHouse = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(`SELECT owner_id FROM houses WHERE id = ?`, [id]);
        if (!rows[0]) return res.status(404).json({ error: "House not found" });
        
        if (req.user.role !== 'admin' && rows[0].owner_id !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await pool.execute(`UPDATE houses SET status = 'active', deleted_at = NULL WHERE id = ?`, [id]);
        res.json({ success: true, message: "Đã khôi phục nhà" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Restore failed" });
    }
};

export const forceDeleteHouse = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    let connection;
    try {
        const pool = await connectDB();
        
        const [houseRows] = await pool.execute(`SELECT owner_id, cover_image FROM houses WHERE id = ?`, [id]);
        if (!houseRows[0]) return res.status(404).json({ error: "House not found" });
        
        if (req.user.role !== 'admin' && houseRows[0].owner_id !== userId) {
             return res.status(403).json({ error: "Unauthorized" });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Clear all related data permanently
        await connection.execute(`DELETE FROM user_houses WHERE house_id = ?`, [id]);
        await connection.execute(`DELETE FROM notifications WHERE house_id = ?`, [id]);
        await connection.execute(`DELETE FROM stock_requests WHERE house_id = ?`, [id]);
        await connection.execute(`DELETE FROM cart_items WHERE product_id IN (SELECT id FROM products WHERE house_id = ?)`, [id]);
        await connection.execute(`DELETE FROM user_inventories WHERE product_id IN (SELECT id FROM products WHERE house_id = ?)`, [id]);
        await connection.execute(`DELETE FROM order_items WHERE product_id IN (SELECT id FROM products WHERE house_id = ?)`, [id]);
        await connection.execute(`DELETE FROM products WHERE house_id = ?`, [id]);
        await connection.execute(`DELETE FROM houses WHERE id = ?`, [id]);

        await connection.commit();

        if (houseRows[0].cover_image) deleteLocalFile(houseRows[0].cover_image);

        res.json({ success: true, message: "Đã xóa vĩnh viễn" });
    } catch (e) {
        if (connection) await connection.rollback();
        console.error(e);
        res.status(500).json({ error: "Force delete failed" });
    } finally {
        if (connection) connection.release();
    }
};
