import { Router } from "express";
import { getHealthStatus, getBenchmarkStats } from "../controllers/healthController.js";

const router = Router();

router.get("/health", getHealthStatus);
router.get("/health/benchmark", getBenchmarkStats);

export default router;
