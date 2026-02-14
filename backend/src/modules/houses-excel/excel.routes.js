import express from "express";
import * as excelController from "./excel.controller.js";
import { verifyAccessToken } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// All routes require login
router.use(verifyAccessToken);

router.get("/:houseId/data", excelController.getExcelData);
router.get("/:houseId/history", excelController.getHistory);

router.post("/:houseId/items", excelController.createItem);
router.patch("/:houseId/items/:itemId", excelController.updateItem);
router.delete("/:houseId/items/:itemId", excelController.deleteItem);

router.post("/:houseId/items/:itemId/toggle", excelController.toggleStatus);

export default router;
