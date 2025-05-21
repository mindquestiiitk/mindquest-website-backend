/**
 * Health Check Routes
 *
 * Provides endpoints for monitoring system health and status
 */

import express from "express";
import { HealthController } from "../controllers/health.controller.js";
import {
  clientAuthMiddleware,
  clientAuthorize,
} from "../middleware/client-auth.middleware.js";
import { UserRole } from "../services/auth.service.js";

const router = express.Router();
const healthController = new HealthController();

// Public health check endpoint
router.get("/", healthController.healthCheck);

// Detailed health check endpoint (admin only)
router.get(
  "/detailed",
  clientAuthMiddleware,
  clientAuthorize([UserRole.ADMIN]),
  healthController.detailedHealthCheck
);

// Security health check endpoint (admin only)
router.get(
  "/security",
  clientAuthMiddleware,
  clientAuthorize([UserRole.ADMIN]),
  healthController.securityHealthCheck
);

export default router;
