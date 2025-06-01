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
    case "GEO_BLOCKED":
      return "Access from your location is not permitted. This service is only available in India.";
    case "CONTENT_FILTERED":
      return "Your message contains inappropriate content. Please revise and try again.";
    case "SPAM_DETECTED":
      return "Spam content detected. Please ensure your message is appropriate.";
    case "ABUSE_DETECTED":
      return "Abusive content detected. Please maintain respectful communication.";
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
        // Enhanced rate limiting for authentication endpoints
        {
          id: "auth-rate-limit",
          max:
            req.user?.role === "admin" || req.user?.role === "superadmin"
              ? 15
              : 5, // Higher limits for admins
          period: "1m", // per minute
          match: [
            { path: "/auth/login" },
            { path: "/auth/register" },
            { path: "/auth/reset-password" },
            { path: "/auth/verify-token" },
          ],
        },

        // Adaptive rate limiting for admin endpoints based on user role
        {
          id: "admin-rate-limit",
          max:
            req.user?.role === "superadmin"
              ? 50
              : req.user?.role === "admin"
              ? 30
              : 5, // Adaptive limits
          period: "1m", // per minute
          match: [{ path: "/admin/*" }, { path: "/superadmin/*" }],
        },

        // Enhanced general rate limiting with user-based adaptation
        {
          id: "general-rate-limit",
          max:
            req.user?.role === "admin"
              ? 120
              : req.user?.role === "counselor"
              ? 100
              : 60, // Role-based limits
          period: "1m", // per minute
          // No match means it applies to all routes not matched above
        },

        // Chat-specific rate limiting to prevent spam
        {
          id: "chat-rate-limit",
          max: req.user?.role === "counselor" ? 100 : 50, // Higher limits for counselors
          period: "1m",
          match: [{ path: "/chat/*" }],
        },

        // Enhanced bot protection with different actions for different endpoints
        {
          id: "bot-protection",
          action: req.path.includes("/admin") ? "block" : "monitor", // Block bots from admin, monitor elsewhere
        },

        // Geographic restriction (configurable countries)
        ...(config.arcjet.enableGeoBlocking
          ? [
              {
                id: "geo-restriction",
                countries: config.arcjet.allowedCountries, // Configurable allowed countries
                action: config.isProduction ? "block" : "monitor", // Only enforce in production
              },
            ]
          : []),

        // Enhanced email validation for registration
        {
          id: "email-validation",
          match: [{ path: "/auth/register" }],
          allowedDomains: config.arcjet.allowedEmailDomains || [
            "iiitkottayam.ac.in",
          ],
        },

        // Content filtering for chat and user input (configurable)
        ...(config.arcjet.enableContentFiltering
          ? [
              {
                id: "content-filter",
                match: [{ path: "/chat/*" }, { path: "/users/*" }],
                patterns: config.arcjet.contentFilterPatterns, // Configurable content filtering patterns
                action: "flag", // Flag for review rather than block
              },
            ]
          : []),
      ],
    });

    // Calculate response time for monitoring
    const responseTime = Math.round(performance.now() - startTime);

    // Store Arcjet result in request for analytics middleware
    req.arcjetResult = {
      ...result,
      responseTime,
      timestamp: new Date().toISOString(),
    };

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
      let errorCode = "ADAPTIVE_RATE_LIMIT_EXCEEDED";

      if (result.reason === "BOT") {
        statusCode = 403; // Forbidden
        errorCode = "BOT_DETECTED";
      } else if (result.reason === "EMAIL_GUARD") {
        statusCode = 400; // Bad Request
        errorCode = "EMAIL_DOMAIN_NOT_ALLOWED";
      } else if (result.reason === "GEO_BLOCKED") {
        statusCode = 403; // Forbidden
        errorCode = "GEO_BLOCKED";
      } else if (result.reason === "CONTENT_FILTERED") {
        statusCode = 400; // Bad Request
        errorCode = "CONTENT_FILTERED";
      } else if (result.reason === "SPAM_DETECTED") {
        statusCode = 400; // Bad Request
        errorCode = "SPAM_DETECTED";
      } else if (result.reason === "ABUSE_DETECTED") {
        statusCode = 400; // Bad Request
        errorCode = "ABUSE_DETECTED";
      } else if (result.reason === "WAF") {
        statusCode = 403; // Forbidden
        errorCode = "WAF_BLOCKED";
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
          code: "MISSING_REQUIRED_FIELD",
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
          code: "EMAIL_DOMAIN_NOT_ALLOWED",
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
