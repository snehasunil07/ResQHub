import { Router } from "express";
import {
  registerUser,
  loginUser,
  getMe,
  forgotPassword,
} from "../controllers/authController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);

// Protected route: Current user
router.get("/me", protect, getMe);

// Role-protected test / verification routes
router.get("/admin-only", protect, authorize("admin"), (req, res) => {
  res.json({
    success: true,
    message: "Admin authorization verified. Access granted to administrative resources.",
    user: { id: req.user._id, role: req.user.role, email: req.user.email },
  });
});

router.get("/volunteer-only", protect, authorize("volunteer", "admin"), (req, res) => {
  res.json({
    success: true,
    message: "Volunteer authorization verified. Access granted to volunteer resources.",
    user: { id: req.user._id, role: req.user.role, email: req.user.email },
  });
});

router.get("/user-only", protect, authorize("user", "volunteer", "admin"), (req, res) => {
  res.json({
    success: true,
    message: "User authorization verified. Access granted to citizen emergency requests.",
    user: { id: req.user._id, role: req.user.role, email: req.user.email },
  });
});

export default router;
