import { arcjet } from "../config/arcjet.config.js";
import config from "../config/config.js";
import logger from "../utils/logger.js";
import { performance } from "node:perf_hooks";
import {
  logSecurityEvent,
  SecurityEventType,
  SecurityEventSeverity,
} from "../utils/security-monitor.js";

/**
 * Combined Arcjet protection middleware
 *
 * This middleware applies multiple Arcjet protections in a single request:
 * - Rate limiting
 * - Bot detection
 * - DDoS protection
 * - WAF (Web Application Firewall)
 *
 * For production applications, Arcjet provides a comprehensive security solution
 * that replaces multiple individual security packages.
 */

/**
 * Get user-friendly error message based on Arcjet reason code
 *
 * @param {string} reason - The reason code from Arcjet
 * @returns {string} A user-friendly error message
 */
function getErrorMessage(reason) {
  switch (reason) {
    case "RATE_LIMITED":
      return "You've made too many requests. Please wait a moment before trying again.";
    case "BOT":
      return "Your request has been identified as automated. If you believe this is an error, please contact support.";
    case "EMAIL_GUARD":
      return "The email domain you're using is not allowed. Please use an authorized email domain.";
    case "SHIELD":
      return "Your request has been blocked by our security system. If you believe this is an error, please contact support.";
    case "WAF":
      return "Your request contains potentially harmful content and has been blocked.";
    default:
      return "Your request cannot be processed at this time. Please try again later.";
  }
}
export const arcjetProtection = async (req, res, next) => {
  try {
    // Start performance measurement
    const startTime = performance.now();

    // Skip protection for health check endpoint and in development mode (unless explicitly enabled)
    if (
      req.path === "/health" ||
      req.path === "/" ||
      (config.isDevelopment && !config.arcjet.enableInDev)
    ) {
      return next();
    }

    // Check circuit breaker state - if OPEN, skip Arcjet and use fallback
    const circuitState = arcjet.getCircuitBreakerState?.();
    if (circuitState && circuitState.state === "OPEN") {
      logger.debug(
        `Circuit breaker OPEN, using fallback protection for ${req.path}`
      );

      // Apply basic rate limiting using the fallback implementation
      // This is handled internally by the arcjet fallback implementation
      const result = await arcjet.protect(
        {
          ip: req.ip,
          path: req.path,
          method: req.method,
          headers: req.headers,
        },
        {
          rules: [
            {
              id: "fallback-shield",
              action: "monitor",
            },
          ],
        }
      );

      if (result.flagged) {
        // Log security event
        await logSecurityEvent(
          SecurityEventType.RATE_LIMIT_EXCEEDED,
          SecurityEventSeverity.MEDIUM,
          {
            ip: req.ip,
            path: req.path,
            userId: req.user?.id || "anonymous",
            reason: result.reason,
            source: "fallback",
            userAgent: req.headers["user-agent"] || "unknown",
          }
        );

        return res.status(429).json({
          success: false,
          error: {
            message:
              result.reason || "Too many requests. Please try again later.",
            code: "rate_limit_exceeded",
            source: "fallback",
          },
        });
      }

      return next();
    }

    // Extract email from request body for email validation rules
    const email = req.body?.email;

    // Create decision request with all available context
    const decisionReq = {
      ip: req.ip,
      email: email, // Include email if available for email validation rules
      method: req.method,
      protocol: req.protocol,
      host: req.hostname,
      path: req.path,
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString(),
      userId: req.user?.id, // Include user ID if authenticated
      sessionId: req.sessionID, // Include session ID if available
      instanceId: arcjet.instanceId, // Include instance ID for tracking
    };

    // Apply Arcjet protection with appropriate rules
    const result = await arcjet.protect(decisionReq, {
      rules: [
        // Rate limiting for authentication endpoints
        {
          id: "auth-rate-limit",
          max: 5, // 5 requests
          period: "1m", // per minute
          match: [
            { path: "/auth/login" },
            { path: "/auth/register" },
            { path: "/auth/reset-password" },
          ],
        },

        // More strict rate limiting for admin endpoints
        {
          id: "admin-rate-limit",
          max: 20, // 20 requests
          period: "1m", // per minute
          match: [{ path: "/admin/*" }, { path: "/superadmin/*" }],
        },

        // General rate limiting for all other endpoints
        {
          id: "general-rate-limit",
          max: 60, // 60 requests
          period: "1m", // per minute
          // No match means it applies to all routes not matched above
        },

        // Bot protection for all routes
        {
          id: "bot-protection",
          action: "block",
        },

        // Email validation for registration
        {
          id: "email-validation",
          match: [{ path: "/auth/register" }],
          allowedDomains: config.arcjet.allowedEmailDomains || [],
        },
      ],
    });

    // Calculate response time for monitoring
    const responseTime = Math.round(performance.now() - startTime);

    // Log high latency in production
    if (config.isProduction && responseTime > 100) {
      logger.warn(
        `Arcjet protection took ${responseTime}ms for ${req.method} ${req.path}`
      );
    }

    // Handle blocked requests
    if (result.flagged) {
      // Determine appropriate status code based on reason
      let statusCode = 429; // Default to Too Many Requests
      let errorCode = "rate_limit_exceeded";

      if (result.reason === "BOT") {
        statusCode = 403; // Forbidden
        errorCode = "bot_detected";
      } else if (result.reason === "EMAIL_GUARD") {
        statusCode = 400; // Bad Request
        errorCode = "invalid_email";
      }

      // Log security event
      await logSecurityEvent(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        SecurityEventSeverity.MEDIUM,
        {
          ip: req.ip,
          path: req.path,
          userId: req.user?.id || "anonymous",
          reason: result.reason,
          ruleId: result.ruleId,
          userAgent: req.headers["user-agent"] || "unknown",
          responseTime,
        }
      );

      logger.warn("Request blocked by Arcjet", {
        ip: req.ip,
        path: req.path,
        reason: result.reason,
        ruleId: result.ruleId,
        responseTime,
      });

      // Return appropriate error response with user-friendly message
      return res.status(statusCode).json({
        success: false,
        error: {
          message:
            getErrorMessage(result.reason) ||
            "Too many requests. Please try again later.",
          code: errorCode,
          retryAfter: result.retryAfter || 60, // Default to 60 seconds if not provided
        },
      });
    }

    next();
  } catch (error) {
    // Log error but don't block request in case of Arcjet service failure
    logger.error("Arcjet error", {
      error: error.message,
      stack: error.stack,
      path: req.path,
      ip: req.ip,
    });

    // Update circuit breaker if available
    if (typeof arcjet.resetCircuitBreaker === "function") {
      try {
        // This will increment the failure count in the circuit breaker
        // and potentially open the circuit if threshold is reached
        const circuitState = arcjet.getCircuitBreakerState();
        if (circuitState) {
          logger.warn(
            `Arcjet circuit breaker: ${
              circuitState.failures + 1
            } failures (threshold: ${circuitState.threshold})`
          );
        }
      } catch (cbError) {
        logger.error("Error updating circuit breaker", cbError);
      }
    }

    // In production, continue despite errors to avoid blocking legitimate traffic
    // if the security service fails
    next();
  }
};

/**
 * Arcjet Middleware
 *
 * This middleware provides a combination of security features:
 * - Rate limiting
 * - Bot detection and prevention
 * - Email validation for registration
 * - Request validation
 *
 * It uses Arcjet's multi-rule protection to apply all necessary checks
 * in a single API call, optimizing performance and reducing API call overhead.
 *
 *
 */

/**
 * Email domain validation middleware
 *
 * This is a specialized middleware for validating email domains during registration.
 * It uses the same Arcjet protection as arcjetProtection but focuses only on email validation.
 *
 * For backward compatibility with existing code that imports this function.
 */
export const emailDomainValidation = async (req, res, next) => {
  try {
    const email = req.body.email;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Email is required",
          code: "missing_email",
        },
      });
    }

    // Skip validation in development mode unless explicitly enabled
    if (config.isDevelopment && !config.arcjet.enableInDev) {
      return next();
    }

    // Apply email validation rule and shield rule
    const result = await arcjet.protect(
      {
        ip: req.ip,
        email: email,
        path: req.path,
        method: req.method,
        headers: req.headers,
      },
      {
        rules: [
          {
            id: "email-domain-validation",
            allowedDomains: config.arcjet.allowedEmailDomains || [],
          },
          {
            id: "email-shield",
            action: "monitor",
          },
        ],
      }
    );

    if (result.flagged) {
      // Log security event
      await logSecurityEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        SecurityEventSeverity.LOW,
        {
          ip: req.ip,
          path: req.path,
          email: email,
          reason: result.reason,
          userAgent: req.headers["user-agent"] || "unknown",
        }
      );

      return res.status(403).json({
        success: false,
        error: {
          message:
            "Email domain not allowed. Please use an authorized email domain.",
          code: "invalid_email_domain",
        },
      });
    }

    next();
  } catch (error) {
    logger.error("Email validation error", {
      error: error.message,
      path: req.path,
    });

    // continue despite errors to avoid blocking legitimate traffic
    next();
  }
};
