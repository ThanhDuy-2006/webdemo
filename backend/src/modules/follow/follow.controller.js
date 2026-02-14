import { connectDB } from "../../utils/db.js";
import { createNotification } from "../notifications/notifications.service.js";

export const followComic = async (req, res) => {
    const userId = req.user.id;
    const { slug, name, thumb, lastChapter } = req.body;

    if (!slug || !name) {
        return res.status(400).json({ error: "Missing required fields: slug and name" });
    }

    try {
        const pool = await connectDB();
        
        // Use INSERT IGNORE or ON DUPLICATE KEY UPDATE to avoid errors if already following
        await pool.execute(
            `INSERT INTO user_follow_comics (user_id, comic_slug, comic_name, comic_thumb, last_chapter) 
             VALUES (?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE comic_name = VALUES(comic_name), comic_thumb = VALUES(comic_thumb)`,
            [userId, slug, name, thumb || null, lastChapter || null]
        );

        res.json({ success: true, message: "Đã theo dõi truyện" });
    } catch (e) {
        console.error("Follow error:", e);
        res.status(500).json({ error: "Lỗi khi theo dõi truyện" });
    }
};

export const unfollowComic = async (req, res) => {
    const userId = req.user.id;
    const { slug } = req.params;

    try {
        const pool = await connectDB();
        await pool.execute(
            `DELETE FROM user_follow_comics WHERE user_id = ? AND comic_slug = ?`,
            [userId, slug]
        );
        res.json({ success: true, message: "Đã bỏ theo dõi" });
    } catch (e) {
        console.error("Unfollow error:", e);
        res.status(500).json({ error: "Lỗi khi bỏ theo dõi" });
    }
};

export const isFollowing = async (req, res) => {
    const userId = req.user.id;
    const { slug } = req.params;

    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(
            `SELECT 1 FROM user_follow_comics WHERE user_id = ? AND comic_slug = ?`,
            [userId, slug]
        );
        res.json({ isFollowing: rows.length > 0 });
    } catch (e) {
        console.error("Check following error:", e);
        res.status(500).json({ error: "Lỗi khi kiểm tra trạng thái theo dõi" });
    }
};

export const getFollowingList = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(
            `SELECT * FROM user_follow_comics WHERE user_id = ? ORDER BY created_at DESC`,
            [userId]
        );
        res.json(rows);
    } catch (e) {
        console.error("Get following list error:", e);
        res.status(500).json({ error: "Lỗi khi lấy danh sách theo dõi" });
    }
};

export const updateLastChapter = async (req, res) => {
    const userId = req.user.id;
    const { slug } = req.params;
    const { lastChapter } = req.body;

    try {
        const pool = await connectDB();
        await pool.execute(
            `UPDATE user_follow_comics SET last_chapter = ? WHERE user_id = ? AND comic_slug = ?`,
            [lastChapter, userId, slug]
        );
        res.json({ success: true });
    } catch (e) {
        console.error("Update last chapter error:", e);
        res.status(500).json({ error: "Lỗi khi cập nhật chương mới" });
    }
};

export const toggleNotification = async (req, res) => {
    const userId = req.user.id;
    const { slug } = req.params;
    const { enabled } = req.body;

    try {
        const pool = await connectDB();
        await pool.execute(
            `UPDATE user_follow_comics SET notify_enabled = ? WHERE user_id = ? AND comic_slug = ?`,
            [enabled, userId, slug]
        );
        res.json({ success: true });
    } catch (e) {
        console.error("Toggle notification error:", e);
        res.status(500).json({ error: "Lỗi khi cập nhật thông báo" });
    }
};
