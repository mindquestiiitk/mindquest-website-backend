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

// Cache health check endpoint (admin only)
router.get(
  "/cache",
  clientAuthMiddleware,
  clientAuthorize([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { getCacheStats } = await import("../utils/firebase-cache.js");
      const cacheStats = getCacheStats();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        cache: {
          ...cacheStats,
          status: cacheStats.enabled ? "healthy" : "disabled",
          performance: {
            hitRate: cacheStats.hitRate,
            efficiency:
              parseFloat(cacheStats.hitRate) > 70
                ? "good"
                : "needs improvement",
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to retrieve cache statistics",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Performance health check endpoint (admin only)
router.get(
  "/performance",
  clientAuthMiddleware,
  clientAuthorize([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { BaseService } = await import("../services/base.service.js");
      const { getCacheStats } = await import("../utils/firebase-cache.js");

      const modelFactoryStats = BaseService.getModelFactoryStats();
      const cacheStats = getCacheStats();
      const memoryUsage = process.memoryUsage();

      // Calculate performance metrics
      const memoryUsagePercent = (
        (memoryUsage.heapUsed / memoryUsage.heapTotal) *
        100
      ).toFixed(2);
      const uptime = process.uptime();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        performance: {
          uptime: `${Math.floor(uptime / 3600)}h ${Math.floor(
            (uptime % 3600) / 60
          )}m`,
          memory: {
            used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
            usage: `${memoryUsagePercent}%`,
            status: parseFloat(memoryUsagePercent) < 80 ? "healthy" : "warning",
          },
          cache: {
            hitRate: cacheStats.hitRate,
            size: cacheStats.size,
            status: cacheStats.enabled ? "active" : "disabled",
          },
          modelFactory: {
            ...modelFactoryStats,
            status: modelFactoryStats.totalModels > 0 ? "active" : "inactive",
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to retrieve performance statistics",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
