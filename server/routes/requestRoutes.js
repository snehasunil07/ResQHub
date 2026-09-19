import { Router } from "express";
import {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
  getAvailableRequests,
  getVolunteerAcceptedRequests,
  acceptRequest,
  completeRequest,
  cancelAcceptedRequest,
} from "../controllers/requestController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import uploadImage from "../middleware/uploadMiddleware.js";

const router = Router();

// Base emergency request routes (Protected)
router.route("/").post(protect, uploadImage, createRequest).get(protect, getRequests);

// Volunteer & Admin workflow routes (Must precede /:id to prevent route collision)
router.get(
  "/available",
  protect,
  authorize("volunteer", "admin"),
  getAvailableRequests
);

router.get(
  "/my-accepted",
  protect,
  authorize("volunteer", "admin"),
  getVolunteerAcceptedRequests
);

router.put(
  "/:id/accept",
  protect,
  authorize("volunteer"),
  acceptRequest
);

router.put(
  "/:id/complete",
  protect,
  authorize("volunteer", "admin"),
  completeRequest
);

router.put(
  "/:id/cancel",
  protect,
  authorize("volunteer", "admin"),
  cancelAcceptedRequest
);

// Specific request CRUD
router
  .route("/:id")
  .get(protect, getRequestById)
  .put(protect, updateRequest)
  .delete(protect, deleteRequest);

export default router;

