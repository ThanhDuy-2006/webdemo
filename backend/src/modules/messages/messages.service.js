import { connectDB } from "../../utils/db.js";

// Get or Create Conversation
export const getOrCreateConversation = async (user1Id, user2Id, houseId, relatedProductId = null) => {
  const pool = await connectDB();
  
  // Ensure consistent ordering for uniqueness check
  const u1Num = Number(user1Id);
  const u2Num = Number(user2Id);
  const [u1, u2] = u1Num < u2Num ? [u1Num, u2Num] : [u2Num, u1Num];

  // Check existing
  const [existing] = await pool.execute(`
    SELECT * FROM conversations 
    WHERE house_id = ? AND user1_id = ? AND user2_id = ?
  `, [houseId, u1, u2]);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new
  const [result] = await pool.execute(`
    INSERT INTO conversations (house_id, user1_id, user2_id, related_product_id)
    VALUES (?, ?, ?, ?)
  `, [houseId, u1, u2, relatedProductId]);

  return { id: result.insertId, house_id: houseId, user1_id: u1, user2_id: u2, related_product_id: relatedProductId };
};

// Get User Conversations
export const getUserConversations = async (userId, houseId = null) => {
  const pool = await connectDB();
  let query = `
    SELECT 
        c.*, h.name as house_name,
        u1.full_name as user1_name, u1.avatar_url as user1_avatar,
        u2.full_name as user2_name, u2.avatar_url as user2_avatar,
        m.content as last_message, m.created_at as last_message_time,
        (SELECT COUNT(*) FROM messages m2 WHERE m2.conversation_id = c.id AND m2.sender_id != ? AND m2.is_read = 0) as unread_count
    FROM conversations c
    JOIN users u1 ON c.user1_id = u1.id
    JOIN users u2 ON c.user2_id = u2.id
    JOIN houses h ON c.house_id = h.id
    LEFT JOIN messages m ON c.last_message_at = m.created_at AND m.conversation_id = c.id
    WHERE (c.user1_id = ? OR c.user2_id = ?)
  `;
  
  const params = [userId, userId, userId];

  if (houseId) {
      query += ` AND c.house_id = ?`;
      params.push(houseId);
  }

  query += ` ORDER BY c.last_message_at DESC`;

  const [rows] = await pool.execute(query, params);
  
  return rows.map(row => {
      const isUser1 = row.user1_id === userId;
      return {
          id: row.id,
          house_id: row.house_id,
          house_name: row.house_name,
          other_user: {
              id: isUser1 ? row.user2_id : row.user1_id,
              name: isUser1 ? row.user2_name : row.user1_name,
              avatar: isUser1 ? row.user2_avatar : row.user1_avatar
          },
          last_message: row.last_message,
          last_message_time: row.last_message_time,
          unread_count: row.unread_count,
          related_product_id: row.related_product_id
      };
  });
};

// Get Single Conversation
export const getConversationById = async (conversationId, userId) => {
  const pool = await connectDB();
  const [rows] = await pool.execute(`
    SELECT 
        c.*, h.name as house_name,
        u1.full_name as user1_name, u1.avatar_url as user1_avatar,
        u2.full_name as user2_name, u2.avatar_url as user2_avatar,
        m.content as last_message, m.created_at as last_message_time,
        (SELECT COUNT(*) FROM messages m2 WHERE m2.conversation_id = c.id AND m2.sender_id != ? AND m2.is_read = 0) as unread_count
    FROM conversations c
    JOIN users u1 ON c.user1_id = u1.id
    JOIN users u2 ON c.user2_id = u2.id
    JOIN houses h ON c.house_id = h.id
    LEFT JOIN messages m ON c.last_message_at = m.created_at AND m.conversation_id = c.id
    WHERE c.id = ? AND (c.user1_id = ? OR c.user2_id = ?)
  `, [userId, conversationId, userId, userId]);

  if (rows.length === 0) return null;

  const row = rows[0];
  const isUser1 = row.user1_id === userId;
  return {
      id: row.id,
      house_id: row.house_id,
      house_name: row.house_name,
      other_user: {
          id: isUser1 ? row.user2_id : row.user1_id,
          name: isUser1 ? row.user2_name : row.user1_name,
          avatar: isUser1 ? row.user2_avatar : row.user1_avatar
      },
      last_message: row.last_message,
      last_message_time: row.last_message_time,
      unread_count: row.unread_count,
      related_product_id: row.related_product_id
  };
};

// Get Messages in Conversation
export const getMessages = async (conversationId, userId) => {
  const pool = await connectDB();
  
  // Verify participation
  const [convo] = await pool.execute(`
    SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)
  `, [conversationId, userId, userId]);

  if (convo.length === 0) throw new Error("Conversation not found or access denied");

  const [rows] = await pool.execute(`
    SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
  `, [conversationId]);

  return rows;
};

// Send Message
export const sendMessage = async (conversationId, senderId, content) => {
  const pool = await connectDB();
  
  // Verify participation
  const [convo] = await pool.execute(`
    SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)
  `, [conversationId, senderId, senderId]);

  if (convo.length === 0) throw new Error("Conversation not found or access denied");

  const [result] = await pool.execute(`
    INSERT INTO messages (conversation_id, sender_id, content)
    VALUES (?, ?, ?)
  `, [conversationId, senderId, content]);

  // Update conversation timestamp
  await pool.execute(`
    UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?
  `, [conversationId]);

  return { id: result.insertId, conversation_id: conversationId, sender_id: senderId, content, created_at: new Date() };
};

// Mark Messages as Read
export const markMessagesAsRead = async (conversationId, userId) => {
  const pool = await connectDB();
  await pool.execute(`
    UPDATE messages 
    SET is_read = 1 
    WHERE conversation_id = ? AND sender_id != ?
  `, [conversationId, userId]);
};
