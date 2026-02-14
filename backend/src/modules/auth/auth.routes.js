import express from "express";
import * as authController from "./auth.controller.js";
import { verifyAccessToken } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/logout-all", verifyAccessToken, authController.logoutAll);
router.post("/refresh-token", authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

router.get("/me", verifyAccessToken, authController.getMe);
router.patch("/change-password", verifyAccessToken, authController.changePassword);

export default router;
