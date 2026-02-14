import express from "express";
import * as followController from "./follow.controller.js";
import { verifyAccessToken } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/following", verifyAccessToken, followController.getFollowingList);
router.get("/is-following/:slug", verifyAccessToken, followController.isFollowing);
router.post("/follow", verifyAccessToken, followController.followComic);
router.delete("/unfollow/:slug", verifyAccessToken, followController.unfollowComic);
router.patch("/update-chapter/:slug", verifyAccessToken, followController.updateLastChapter);
router.patch("/toggle-notify/:slug", verifyAccessToken, followController.toggleNotification);

export default router;
