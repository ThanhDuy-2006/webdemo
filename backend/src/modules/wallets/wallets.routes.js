import express from "express";
import * as walletController from "./wallets.controller.js";
import { verifyAccessToken } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", verifyAccessToken, walletController.getWalletFull);
router.get("/me", verifyAccessToken, walletController.getMyWallet);
router.get("/stats", verifyAccessToken, walletController.getWalletStats);
router.get("/transactions", verifyAccessToken, walletController.getMyTransactions);
router.post("/topup", verifyAccessToken, walletController.topUpWallet); 
router.post("/admin-deposit", verifyAccessToken, walletController.adminDeposit); 

export default router;
