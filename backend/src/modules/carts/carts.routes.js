import express from "express";
import * as cartController from "./carts.controller.js";
import { verifyAccessToken } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", verifyAccessToken, cartController.getCart);
router.post("/add", verifyAccessToken, cartController.addToCart);
router.post("/remove", verifyAccessToken, cartController.removeFromCart);

export default router;
