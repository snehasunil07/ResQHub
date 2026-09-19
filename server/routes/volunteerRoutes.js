import express from "express";
import { getLeaderboard } from "../controllers/volunteerController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/volunteers/leaderboard
 * @desc    Get real-time volunteer leaderboard with time filters and rankings
 * @access  Private (Authenticated users, volunteers, admins)
 */
router.get("/leaderboard", protect, getLeaderboard);

export default router;
