/**
 * Security Monitoring Utility
 *
 * This utility provides lightweight security logging functions.
 *
 * For a production Firebase app:
 * 1. Use Firebase Authentication for user management and security
 * 2. Use Arcjet for rate limiting and abuse prevention
 * 3. Use Firebase Security Rules for data access control
 * 4. Consider Firebase Cloud Functions for advanced security monitoring
 */

import logger from "./logger.js";

// Security event types
export const SecurityEventType = {
  FAILED_LOGIN: "failed_login",
  SUCCESSFUL_LOGIN: "successful_login",
  SUSPICIOUS_ACTIVITY: "suspicious_activity",
  BRUTE_FORCE_ATTEMPT: "brute_force_attempt",
  SESSION_HIJACKING_ATTEMPT: "session_hijacking_attempt",
  UNAUTHORIZED_ACCESS: "unauthorized_access",
  RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
  ADMIN_ACTION: "admin_action",
  ROLE_CHANGE: "role_change",
  ACCOUNT_LOCKOUT: "account_lockout",
  ACCOUNT_RECOVERY: "account_recovery",
};

// Security event severity levels
export const SecurityEventSeverity = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

/**
 * Log a security event to application logs
 * For production, consider using Firebase Cloud Functions to process these logs
 * and trigger alerts for high-severity events
 *
 * @param {string} type - Event type from SecurityEventType
 * @param {string} severity - Severity level from SecurityEventSeverity
 * @param {Object} details - Event details
 */
export async function logSecurityEvent(type, severity, details) {
  try {
    // Create event object
    const event = {
      type,
      severity,
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip || "unknown",
      userId: details.userId || "anonymous",
      userAgent: details.userAgent || "unknown",
    };

    // Log based on severity
    if (
      severity === SecurityEventSeverity.HIGH ||
      severity === SecurityEventSeverity.CRITICAL
    ) {
      logger.error(`SECURITY ALERT: ${type}`, { securityEvent: event });
    } else if (severity === SecurityEventSeverity.MEDIUM) {
      logger.warn(`Security event: ${type}`, { securityEvent: event });
    } else {
      logger.info(`Security info: ${type}`, { securityEvent: event });
    }

    return true;
  } catch (error) {
    logger.error("Error logging security event", {
      error: error.message,
      stack: error.stack,
      type,
      severity,
    });

    return false;
  }
}

// Note: For a production Firebase app, consider implementing a Cloud Function
// that processes security logs and sends alerts for critical events
