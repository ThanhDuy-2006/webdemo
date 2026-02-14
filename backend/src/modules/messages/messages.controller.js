import * as messageService from "./messages.service.js";
import * as notificationService from "../notifications/notifications.service.js";
import { emitToUser } from "../../utils/socket.js";

// Start or Get Conversation
export const startConversation = async (req, res) => {
  try {
    const { targetUserId, houseId, productId } = req.body;
    const conversation = await messageService.getOrCreateConversation(req.user.id, targetUserId, houseId, productId);
    const fullConversation = await messageService.getConversationById(conversation.id, req.user.id);
    res.json(fullConversation);
  } catch (error) {
    console.error("Error starting conversation:", error);
    res.status(500).json({ message: "Failed to start conversation" });
  }
};

// Get Single Conversation
export const getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await messageService.getConversationById(id, req.user.id);
    if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
    }
    res.json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ message: "Failed to fetch conversation" });
  }
};

// Get User Conversations
export const getConversations = async (req, res) => {
  try {
    const { house_id } = req.query;
    const conversations = await messageService.getUserConversations(req.user.id, house_id);
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

// Get Messages
export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await messageService.getMessages(id, req.user.id);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// Send Message
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const message = await messageService.sendMessage(conversationId, req.user.id, content);
    
    // Trigger Notification for the recipient
    try {
       const fullConvo = await messageService.getConversationById(conversationId, req.user.id);
       
       if (fullConvo) {
           const receiverId = fullConvo.other_user.id;
           
           await notificationService.createNotification({
               userId: receiverId,
               houseId: fullConvo.house_id,
               type: 'NEW_MESSAGE',
               title: 'Tin nhắn mới',
               message: `Bạn có tin nhắn mới từ ${req.user.full_name}`,
               data: { 
                   conversationId: conversationId, 
                   senderId: req.user.id,
                   receiverId: receiverId,
                   houseId: fullConvo.house_id
               }
           });

            // Emit Realtime Events via Socket
            const socketPayload = {
                id: message.id,
                conversationId,
                content: content,
                senderId: req.user.id,
                senderName: req.user.full_name,
                created_at: message.created_at
            };

            // Emit to recipient
            emitToUser(receiverId, "newMessage", socketPayload);

            // Emit to sender (for other tabs)
            emitToUser(req.user.id, "newMessage", socketPayload);

            emitToUser(receiverId, "newNotification", {
                message: `Tin nhắn mới từ ${req.user.full_name}`,
                type: 'NEW_MESSAGE'
            });
        }
    } catch (notifError) {
        console.error("Failed to send notification for message:", notifError);
    }

    res.json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

// Mark Read
export const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    await messageService.markMessagesAsRead(id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking read:", error);
    res.status(500).json({ message: "Failed to mark as read" });
  }
};
