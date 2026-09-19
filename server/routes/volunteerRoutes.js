import express from "express";
import { getLeaderboard } from "../controllers/volunteerController.js";
import { optionalProtect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/volunteers/leaderboard
 * @desc    Get real-time volunteer leaderboard (Publicly viewable; personalized when authenticated)
 * @access  Public (Read-only)
 */
router.get("/leaderboard", optionalProtect, getLeaderboard);

export default router;
