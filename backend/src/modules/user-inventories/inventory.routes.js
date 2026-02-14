import express from "express";
import * as inventoryController from "./inventory.controller.js";
import { verifyAccessToken } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", verifyAccessToken, inventoryController.getMyInventory);
router.patch("/:id/toggle", verifyAccessToken, inventoryController.toggleSelling);
router.post("/resell", verifyAccessToken, inventoryController.resellItem);
router.patch("/:id", verifyAccessToken, inventoryController.updateInventoryItem);
router.delete("/:id", verifyAccessToken, inventoryController.deleteInventoryItem);
router.post("/bulk-delete", verifyAccessToken, inventoryController.bulkDeleteInventories);
router.post("/bulk-restore", verifyAccessToken, inventoryController.bulkRestoreInventories);
router.post("/bulk-force-delete", verifyAccessToken, inventoryController.bulkForceDeleteInventories);
router.post("/:id/restore", verifyAccessToken, inventoryController.restoreInventoryItem);
router.delete("/:id/force", verifyAccessToken, inventoryController.forceDeleteInventoryItem);

export default router;
