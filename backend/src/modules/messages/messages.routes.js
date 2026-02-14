import express from "express";
import { verifyAccessToken } from "../../middlewares/authMiddleware.js";
import * as messageController from "./messages.controller.js";

const router = express.Router();

router.use(verifyAccessToken);

router.post("/conversations", messageController.startConversation);
router.get("/conversations", messageController.getConversations);
router.get("/conversations/:id", messageController.getConversation);
router.get("/conversations/:id/messages", messageController.getMessages);
router.post("/messages", messageController.sendMessage);
router.put("/conversations/:id/read", messageController.markRead);

export default router;
