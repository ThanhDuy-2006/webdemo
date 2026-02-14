
import express from "express";
import { verifyAccessToken } from "../../middlewares/authMiddleware.js";
import * as notificationController from "./notifications.controller.js";

const router = express.Router();

router.use(verifyAccessToken);

router.get("/", notificationController.getNotifications);
router.put("/:id/read", notificationController.markAsRead);
router.put("/read-all", notificationController.markAllAsRead);

export default router;
