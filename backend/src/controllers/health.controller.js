/**
 * Health Check Controller
 *
 * Provides endpoints for monitoring system health and status
 */

import { db } from "../config/firebase.config.js";
import { catchAsync } from "../utils/error.js";
import logger from "../utils/logger.js";
import os from "os";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { arcjet } from "../config/arcjet.config.js";

// Get package.json data
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));

export class HealthController {
  /**
   * Basic health check endpoint
   * Returns 200 OK if the server is running
   */
  healthCheck = catchAsync(async (_, res) => {
    res.status(200).json({
      status: "success",
      message: "Server is running",
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Detailed health check endpoint
   * Checks database connectivity and returns system information
   */
  detailedHealthCheck = catchAsync(async (_, res) => {
    // Check database connectivity
    let dbStatus = "ok";
    let dbError = null;

    try {
      // Try to read from Firestore to verify connectivity
      const healthCheck = await db.collection("health").doc("check").get();
      if (!healthCheck.exists) {
        // Create health check document if it doesn't exist
        await db.collection("health").doc("check").set({
          lastChecked: new Date().toISOString(),
        });
      } else {
        // Update last checked timestamp
        await db.collection("health").doc("check").update({
          lastChecked: new Date().toISOString(),
        });
      }
    } catch (error) {
      dbStatus = "error";
      dbError = error.message;
      logger.error("Database health check failed", { error });
    }

    // Check security services (Arcjet)
    let securityStatus = "ok";
    let securityError = null;
    let arcjetHealth = null;

    try {
      // Get Arcjet health status if available
      if (arcjet && typeof arcjet.healthCheck === "function") {
        arcjetHealth = arcjet.healthCheck();
      } else if (arcjet) {
        // Basic health check if healthCheck method is not available
        arcjetHealth = {
          healthy: true,
          mode: "normal",
          instanceId: arcjet.instanceId || "unknown",
        };
      }

      // Get circuit breaker state if available
      const circuitBreaker =
        arcjet && typeof arcjet.getCircuitBreakerState === "function"
          ? arcjet.getCircuitBreakerState()
          : { state: "UNKNOWN" };

      // Add circuit breaker info to health data
      if (arcjetHealth) {
        arcjetHealth.circuitBreaker = circuitBreaker.state;
        arcjetHealth.failures = circuitBreaker.failures || 0;

        // If circuit breaker is open, mark security as degraded
        if (circuitBreaker.state === "OPEN") {
          securityStatus = "degraded";
          securityError = `Circuit breaker is OPEN after ${circuitBreaker.failures} failures`;
        }
      }
    } catch (error) {
      securityStatus = "error";
      securityError = error.message;
      logger.error("Security health check failed", { error });
    }

    // Get system information
    const systemInfo = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      loadAverage: os.loadavg(),
      cpuCount: os.cpus().length,
    };

    // Calculate memory usage percentage
    const memoryUsagePercent = (
      (1 - systemInfo.freeMemory / systemInfo.totalMemory) *
      100
    ).toFixed(2);

    // Get application information
    const appInfo = {
      version: pkg.version,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
    };

    // Determine overall status (worst of all statuses)
    const overallStatus = [dbStatus, securityStatus].includes("error")
      ? "error"
      : [dbStatus, securityStatus].includes("degraded")
      ? "degraded"
      : "ok";

    // Return health status
    res.status(overallStatus === "error" ? 500 : 200).json({
      status: overallStatus === "ok" ? "success" : overallStatus,
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        error: dbError,
      },
      security: {
        status: securityStatus,
        error: securityError,
        arcjet: arcjetHealth,
      },
      system: {
        ...systemInfo,
        memoryUsagePercent: `${memoryUsagePercent}%`,
      },
      application: appInfo,
    });
  });

  /**
   * Security health check endpoint
   * Checks security services status
   */
  securityHealthCheck = catchAsync(async (_, res) => {
    try {
      // Get Arcjet health status
      const arcjetHealth =
        arcjet && typeof arcjet.healthCheck === "function"
          ? arcjet.healthCheck()
          : {
              healthy: true,
              mode: "normal",
              instanceId: arcjet.instanceId || "unknown",
            };

      // Get circuit breaker state if available
      const circuitBreaker =
        arcjet && typeof arcjet.getCircuitBreakerState === "function"
          ? arcjet.getCircuitBreakerState()
          : { state: "UNKNOWN" };

      // Get metrics if available
      const metrics =
        arcjet && typeof arcjet.getMetrics === "function"
          ? arcjet.getMetrics()
          : { instanceId: arcjet.instanceId || "unknown" };

      // Determine status based on circuit breaker state
      let status = "success";
      if (circuitBreaker.state === "OPEN") {
        status = "degraded";
      } else if (!arcjetHealth.healthy) {
        status = "error";
      }

      const securityHealth = {
        status,
        timestamp: new Date().toISOString(),
        arcjet: {
          healthy: arcjetHealth.healthy,
          mode: arcjetHealth.mode,
          instanceId: arcjetHealth.instanceId,
          circuitBreaker: circuitBreaker.state,
          failures: circuitBreaker.failures || 0,
          lastFailure: circuitBreaker.lastFailure
            ? new Date(circuitBreaker.lastFailure).toISOString()
            : null,
        },
        metrics: {
          instanceId: metrics.instanceId,
          uptime: metrics.uptime || process.uptime(),
        },
      };

      res.status(200).json(securityHealth);
    } catch (error) {
      logger.error("Error in security health check", error);

      res.status(500).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  });
}
