
import { connectDB } from "../../utils/db.js";

// Create a new notification
export const createNotification = async ({ userId, houseId, type, title, message, data }) => {
  try {
    const pool = await connectDB();
    const [result] = await pool.execute(`
        INSERT INTO notifications (user_id, house_id, type, title, message, data)
        VALUES (?, ?, ?, ?, ?, ?);
      `, [userId, houseId, type, title, message, JSON.stringify(data || {})]);
    return result;
  } catch (error) {
    console.error("Error creating notification:", error);
    // Don't throw, just log. Notifications shouldn't break the main flow.
  }
};

// Get notifications for a user
export const getUserNotifications = async (userId) => {
  const pool = await connectDB();
  const [rows] = await pool.execute(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [userId]);
    
  return rows.map(n => ({
    ...n,
    data: n.data ? (typeof n.data === 'string' ? JSON.parse(n.data) : n.data) : {}
  }));
};

// Mark a single notification as read
export const markAsRead = async (notificationId, userId) => {
  const pool = await connectDB();
  await pool.execute(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE id = ? AND user_id = ?
    `, [notificationId, userId]);
};

// Mark all notifications as read for a user
export const markAllAsRead = async (userId) => {
  const pool = await connectDB();
  await pool.execute(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE user_id = ?
    `, [userId]);
};

