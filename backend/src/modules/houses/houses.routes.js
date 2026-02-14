import express from "express";
import * as houseController from "./houses.controller.js";
import { verifyAccessToken, requireOwner, extractUser } from "../../middlewares/authMiddleware.js";
import { upload } from "../../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/", extractUser, houseController.getHouses); // Public list (with optional ?scope=joined)
router.post("/", verifyAccessToken, upload.single('cover_image'), houseController.createHouse); // Create
router.get("/:id", houseController.getHouseDetail); // Details

// Memberships
router.get("/:id/membership", verifyAccessToken, houseController.getMembership); // My Role (was getHouseRole)
router.post("/:id/memberships", verifyAccessToken, houseController.createMembership); // Join (was joinHouse)
router.patch("/:id/memberships/:userId", verifyAccessToken, requireOwner, houseController.updateMemberStatus); // Approve/Reject - Owner Only
router.get("/:id/members", verifyAccessToken, houseController.getMembers); // Get Members List
router.patch("/:id/cover", verifyAccessToken, requireOwner, upload.single('cover_image'), houseController.updateHouseCover); // Update Cover (Image) - Owner Only
router.patch("/:id/cover-position", verifyAccessToken, requireOwner, houseController.updateHouseCoverPosition); // Update Cover Position (JSON) - Owner Only
router.delete("/:id/cover", verifyAccessToken, requireOwner, houseController.deleteHouseCover); // Delete Cover - Owner Only
router.delete("/:id", verifyAccessToken, houseController.deleteHouse); // Soft Delete
router.post("/:id/restore", verifyAccessToken, houseController.restoreHouse);
router.delete("/:id/force", verifyAccessToken, houseController.forceDeleteHouse);

export default router;
