
import express from "express";
import { upload } from "../../middlewares/uploadMiddleware.js";
import * as usersController from "./users.controller.js";
import { verifyAccessToken, requireAdmin } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.patch("/me", verifyAccessToken, upload.single('avatar'), usersController.updateProfile);
router.put("/theme", verifyAccessToken, usersController.updateTheme);

// Admin routes
router.get("/admin/all", verifyAccessToken, requireAdmin, usersController.getAllUsersAdmin);
router.patch("/admin/:id/status", verifyAccessToken, requireAdmin, usersController.updateUserStatusAdmin);
router.delete("/admin/:id", verifyAccessToken, requireAdmin, usersController.deleteUserAdmin);

export default router;
