import express from "express";
import { getActivityStats, getActivityCharts } from "./activity.controller.js";
import { requireAdmin } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// All user activity routes require admin privileges
router.get("/stats", requireAdmin, getActivityStats);
router.get("/charts", requireAdmin, getActivityCharts);

export default router;
