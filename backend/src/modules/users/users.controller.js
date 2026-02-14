import bcrypt from "bcryptjs";
import { connectDB } from "../../utils/db.js";

import { deleteLocalFile } from "../../utils/fileHelper.js";

export const updateProfile = async (req, res) => {
    const userId = req.user.id;
    const { full_name, phone } = req.body;
    const file = req.file; // From multer

    try {
        const pool = await connectDB();
        
        // 1. Get current avatar to delete if needed
        const [currentUser] = await pool.execute("SELECT avatar_url FROM users WHERE id = ?", [userId]);
        const oldAvatar = currentUser[0]?.avatar_url;

        let updateQuery = "UPDATE users SET ";
        const params = [];
        
        if (full_name) {
            updateQuery += "full_name = ?, ";
            params.push(full_name);
        }
        if (phone) {
            updateQuery += "phone = ?, ";
            params.push(phone);
        }
        if (file) {
            const apiUrl = process.env.API_URL || "http://localhost:3000";
            const avatarUrl = `${apiUrl}/uploads/${file.filename}`;
            updateQuery += "avatar_url = ?, ";
            params.push(avatarUrl);

            // Delete old avatar
            if (oldAvatar) deleteLocalFile(oldAvatar);
        }
        
        if (params.length === 0) return res.json({ message: "No changes" });
        updateQuery = updateQuery.slice(0, -2);
        
        updateQuery += " WHERE id = ?";
        params.push(userId);
        
        await pool.execute(updateQuery, params);
        
        // Return updated user
        const [rows] = await pool.execute("SELECT id, full_name, email, role, phone, avatar_url FROM users WHERE id = ?", [userId]);
        res.json({ success: true, user: rows[0] });
        
    } catch (e) {
        console.error("Update profile error:", e);
        res.status(500).json({ error: e.message });
    }
};

export const updateTheme = async (req, res) => {
    const userId = req.user.id;
    const { theme_config } = req.body; // Expect JSON string or object

    try {
        const pool = await connectDB();
        const configStr = typeof theme_config === 'string' ? theme_config : JSON.stringify(theme_config);

        await pool.execute("UPDATE users SET theme_config = ? WHERE id = ?", [configStr, userId]);
        res.json({ success: true, theme_config: configStr });
    } catch (e) {
        console.error("Update theme error:", e);
        res.status(500).json({ error: "Update theme failed" });
    }
};

// ADMIN FUNCTIONS
export const getAllUsersAdmin = async (req, res) => {
    const { search = '', startDate = '', endDate = '' } = req.query;
    try {
        const pool = await connectDB();
        
        let query = "SELECT id, full_name, email, role, status, phone, avatar_url, created_at FROM users WHERE deleted_at IS NULL";
        const params = [];

        if (search) {
            query += " AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)";
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (startDate) {
            query += " AND created_at >= ?";
            params.push(startDate);
        }

        if (endDate) {
            // Add time to end of day to include the whole day
            query += " AND created_at <= ?";
            params.push(`${endDate} 23:59:59`);
        }

        query += " ORDER BY created_at DESC";
        
        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (e) {
        console.error("Get all users error:", e);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

export const updateUserStatusAdmin = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'locked'

    if (!['active', 'locked'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    try {
        const pool = await connectDB();
        await pool.execute("UPDATE users SET status = ? WHERE id = ?", [status, id]);
        res.json({ success: true, message: `User status updated to ${status}` });
    } catch (e) {
        console.error("Update user status error:", e);
        res.status(500).json({ error: "Failed to update status" });
    }
};

export const deleteUserAdmin = async (req, res) => {
    const { id } = req.params;

    if (Number(id) === req.user.id) {
        return res.status(400).json({ error: "Cannot delete yourself" });
    }

    try {
        const pool = await connectDB();
        
        // Soft Delete: Set status to locked and update deleted_at
        // We do NOT delete related data (carts, houses) to preserve history/references (FK)
        await pool.execute(
            "UPDATE users SET status = 'locked', deleted_at = NOW() WHERE id = ?", 
            [id]
        );

        res.json({ success: true, message: "User soft-deleted successfully (Locked & Marked)" });
    } catch (e) {
        console.error("Delete user error:", e);
        res.status(500).json({ error: "Failed to delete user." });
    }
};

