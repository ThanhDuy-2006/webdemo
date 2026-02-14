import express from "express";
import * as stockController from "./stock.controller.js";
import { verifyAccessToken } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", verifyAccessToken, stockController.createRequest);
router.get("/", verifyAccessToken, stockController.getRequests);
router.patch("/:id/approve", verifyAccessToken, stockController.approveRequest);

export default router;
