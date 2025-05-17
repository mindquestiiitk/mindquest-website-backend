/**
 * Arcjet Routes
 * Handles routes related to Arcjet protection
 *
 * Production-ready implementation with:
 * - Proper error handling
 * - Logging for security events
 * - Integration with Arcjet backend service
 * - Fallback mechanisms for resilience
 */
import express from "express";
import logger from "../utils/logger.js";
import { arcjet } from "../config/arcjet.config.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import { performance } from "node:perf_hooks";
import {
  logSecurityEvent,
  SecurityEventType,
  SecurityEventSeverity,
} from "../utils/security-monitor.js";

const router = express.Router();

// Log all Arcjet route access
router.use((req, res, next) => {
  logger.debug(`Arcjet route accessed: ${req.method} ${req.path}`, {
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.headers["user-agent"]?.substring(0, 100),
  });
  next();
});

/**
 * Arcjet protection proxy endpoint
 * This endpoint allows the frontend to use Arcjet protection without exposing API keys
 */
router.post("/arcjet-protect", arcjetProtection, async (req, res) => {
  const startTime = performance.now();

  try {
    // Extract data from request
    const { options, fingerprint } = req.body;

    if (!options) {
      return res.status(400).json({
        allowed: false,
        type: "error",
        reason: "Missing options in request",
        isDenied: true,
      });
    }

    // Combine client fingerprint with server-side data for better protection
    const requestData = {
      ip: req.ip,
      path: req.path,
      method: req.method,
      headers: req.headers,
      userAgent: req.headers["user-agent"],
      email: options.email,
      action: options.action,
      fingerprint,
      timestamp: new Date().toISOString(),
    };

    // Determine which rules to apply based on the action
    let rules = [];

    switch (options.action) {
      case "authentication":
        rules = [
          arcjet.rateLimit({
            id: "auth-rate-limit",
            max: 5,
            period: "1m",
          }),
          arcjet.shield({
            id: "auth-bot-protection",
            action: "block",
          }),
        ];
        break;

      case "registration":
        rules = [
          arcjet.rateLimit({
            id: "registration-rate-limit",
            max: 3,
            period: "1m",
          }),
          arcjet.shield({
            id: "registration-bot-protection",
            action: "block",
          }),
          arcjet.emailGuard({
            id: "email-validation",
            allowedDomains: ["iiitkottayam.ac.in"],
          }),
        ];
        break;

      case "password-reset":
        rules = [
          arcjet.rateLimit({
            id: "password-reset-rate-limit",
            max: 3,
            period: "5m",
          }),
          arcjet.shield({
            id: "password-reset-bot-protection",
            action: "block",
          }),
        ];
        break;

      case "form-submission":
        rules = [
          arcjet.rateLimit({
            id: "form-submission-rate-limit",
            max: 10,
            period: "1m",
          }),
          arcjet.shield({
            id: "form-submission-bot-protection",
            action: "block",
          }),
        ];
        break;

      default:
        // Default rules for any other action
        rules = [
          arcjet.rateLimit({
            id: "default-rate-limit",
            max: 20,
            period: "1m",
          }),
        ];
    }

    // Apply Arcjet protection
    const result = await arcjet.protect(requestData, { rules });

    // Calculate response time for monitoring
    const responseTime = Math.round(performance.now() - startTime);

    // Log blocked requests for security monitoring
    if (result.flagged) {
      await logSecurityEvent(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        SecurityEventSeverity.MEDIUM,
        {
          ip: req.ip,
          action: options.action,
          email: options.email,
          reason: result.reason,
          ruleId: result.ruleId,
          responseTime,
        }
      );

      logger.warn("Request blocked by Arcjet", {
        ip: req.ip,
        action: options.action,
        reason: result.reason,
        ruleId: result.ruleId,
        responseTime,
      });
    }

    // Return result to client
    return res.status(200).json({
      allowed: !result.flagged,
      type: result.flagged ? "blocked" : "success",
      reason: result.reason || "Protection passed",
      ruleId: result.ruleId,
      // Add a function that can be stringified and then evaluated on the client
      isDenied: result.flagged,
    });
  } catch (error) {
    // Log the error for monitoring
    logger.error("Arcjet protection error", {
      error: error.message,
      stack: error.stack,
      path: req.path,
      ip: req.ip,
    });

    // Log security event
    await logSecurityEvent(
      SecurityEventType.SYSTEM_ERROR,
      SecurityEventSeverity.HIGH,
      {
        ip: req.ip,
        path: req.path,
        error: error.message,
      }
    );

    // In production, we fail open to avoid blocking legitimate users
    return res.status(200).json({
      allowed: true,
      type: "error",
      reason: "Error in server-side protection",
      isDenied: false,
    });
  }
});

/**
 * Arcjet health check endpoint
 * This endpoint allows monitoring systems to check the health of Arcjet
 */
router.get("/arcjet-health", async (req, res) => {
  try {
    const health = arcjet.healthCheck();
    return res.status(200).json({
      healthy: health.healthy,
      mode: health.mode,
      circuitBreakerState: health.circuitBreakerState,
      instanceId: health.instanceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Arcjet health check error", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      healthy: false,
      error: "Error checking Arcjet health",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
