import express from "express";
import { upload } from "../../middlewares/uploadMiddleware.js";
import * as productController from "./products.controller.js";
import { verifyAccessToken } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", productController.getProducts); 
router.get("/my-listings", verifyAccessToken, productController.getMyListings);
router.get("/trash", verifyAccessToken, productController.getTrashProducts);
router.post("/", verifyAccessToken, upload.single('image'), productController.createProduct);
router.post("/bulk-delete", verifyAccessToken, productController.bulkDelete);
router.post("/bulk-restore", verifyAccessToken, productController.bulkRestore);
router.post("/bulk-force-delete", verifyAccessToken, productController.bulkForceDelete);
router.patch("/bulk-status", verifyAccessToken, productController.bulkUpdateStatus);
router.post("/:id/restore", verifyAccessToken, productController.restoreProduct);
router.delete("/:id/force", verifyAccessToken, productController.forceDeleteProduct);
router.delete("/:id", verifyAccessToken, productController.deleteProduct);
router.patch("/:id", verifyAccessToken, productController.updateProduct);
router.patch("/:id/status", verifyAccessToken, productController.updateProductStatus);
router.post("/import", verifyAccessToken, upload.any(), productController.importProducts);

// Wallet & Buy
router.post("/:id/buy", verifyAccessToken, productController.buyProduct);
router.get("/house/:houseId/transactions", verifyAccessToken, productController.getHouseTransactions);

export default router;
