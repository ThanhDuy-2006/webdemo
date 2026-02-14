import express from "express";
import { upload } from "../../middlewares/uploadMiddleware.js";
import { verifyAccessToken, requireAdmin } from "../../middlewares/authMiddleware.js";
import * as depositController from "./deposits.controller.js";

const router = express.Router();

// USER ROUTES
router.post("/request", verifyAccessToken, upload.single('proof'), depositController.createDepositRequest);
router.get("/my-requests", verifyAccessToken, depositController.getMyDepositRequests);

// ADMIN ROUTES
router.get("/admin/all", requireAdmin, depositController.getAllDepositRequestsAdmin);
router.post("/admin/:id/approve", requireAdmin, depositController.approveDepositRequest);
router.post("/admin/:id/reject", requireAdmin, depositController.rejectDepositRequest);

export default router;
