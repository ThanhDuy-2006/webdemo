import express from "express";
import * as orderController from "./orders.controller.js";
import { verifyAccessToken } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/checkout", verifyAccessToken, orderController.checkout);
// Add list orders later if needed
router.get("/my-items", verifyAccessToken, orderController.getMyPurchasedItems);
router.get("/sold-items", verifyAccessToken, orderController.getMySoldItems);

export default router;
