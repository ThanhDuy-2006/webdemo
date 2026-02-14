import express from "express";
import * as analyticsController from "./analytics.controller.js";
import { requireAdmin } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Only Admins can access analytics
router.get("/peak-hour", requireAdmin, analyticsController.getPeakHourAnalytics);

export default router;
