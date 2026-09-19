import { Router } from "express";
import {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  getSubscriptionStatus,
  sendTestNotification,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// All notification management endpoints require authentication
router.get("/vapid-public-key", protect, getVapidPublicKey);
router.post("/subscribe", protect, subscribe);
router.delete("/subscribe", protect, unsubscribe);
router.get("/status", protect, getSubscriptionStatus);
router.post("/test", protect, sendTestNotification);

export default router;
