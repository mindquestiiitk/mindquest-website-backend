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
  SESSION_HIJACKING: "session_hijacking", // Added for collection ID-based security
  UNAUTHORIZED_ACCESS: "unauthorized_access",
  RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
  ADMIN_ACTION: "admin_action",
  ROLE_CHANGE: "role_change",
  ACCOUNT_LOCKOUT: "account_lockout",
  ACCOUNT_RECOVERY: "account_recovery",
  TOKEN_VERIFICATION_FAILED: "token_verification_failed",
  COLLECTION_ID_MISMATCH: "collection_id_mismatch", // Added for collection ID-based security
};

// Security event severity levels
export const SecurityEventSeverity = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

/**
 * Log a security event to application logs and Firestore
 * For production, this logs to both application logs and a dedicated Firestore collection
 * to enable security monitoring and alerting
 *
 * @param {string} type - Event type from SecurityEventType
 * @param {string} severity - Severity level from SecurityEventSeverity
 * @param {Object} details - Event details
 * @returns {Promise<boolean>} - Success status
 */
export async function logSecurityEvent(type, severity, details) {
  // Start performance timing
  const startTime = Date.now();

  try {
    // Sanitize and normalize details to prevent PII leakage
    const sanitizedDetails = sanitizeSecurityEventDetails(details);

    // Create event object
    const event = {
      type,
      severity,
      details: sanitizedDetails,
      timestamp: new Date().toISOString(),
      ip: sanitizedDetails.ip || "unknown",
      userId: sanitizedDetails.userId || "anonymous",
      userAgent: sanitizedDetails.userAgent
        ? sanitizedDetails.userAgent.substring(0, 200) // Limit length
        : "unknown",
      path: sanitizedDetails.path || "unknown",
      method: sanitizedDetails.method || "unknown",
      requestId: sanitizedDetails.requestId || `req-${Date.now()}`,
    };

    // Log based on severity
    if (
      severity === SecurityEventSeverity.HIGH ||
      severity === SecurityEventSeverity.CRITICAL
    ) {
      logger.error(`SECURITY ALERT: ${type}`, { securityEvent: event });

      // For critical events, we could trigger immediate notifications
      // This would be implemented in a production environment
      if (severity === SecurityEventSeverity.CRITICAL) {
        // In production, this would call a notification service
        // For now, we just log it with a special marker
        logger.error(`🚨 CRITICAL SECURITY ALERT: ${type}`, {
          securityEvent: event,
          needsImmediate: true,
        });
      }
    } else if (severity === SecurityEventSeverity.MEDIUM) {
      logger.warn(`Security event: ${type}`, { securityEvent: event });
    } else {
      logger.info(`Security info: ${type}`, { securityEvent: event });
    }

    // In a production environment, we would also store this in Firestore
    // This is commented out to avoid dependencies, but would be implemented in production
    /*
    try {
      // Store in Firestore security_events collection
      const db = getFirestore();
      await db.collection('security_events').add({
        ...event,
        created: FieldValue.serverTimestamp(),
      });
    } catch (dbError) {
      logger.error("Failed to store security event in database", {
        error: dbError.message,
        type,
        severity,
      });
    }
    */

    // Log performance
    const duration = Date.now() - startTime;
    logger.debug(`Security event logged in ${duration}ms`, {
      type,
      severity,
      duration: `${duration}ms`,
    });

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

/**
 * Sanitize security event details to prevent PII leakage
 * @param {Object} details - Raw event details
 * @returns {Object} - Sanitized details
 */
function sanitizeSecurityEventDetails(details) {
  if (!details) return {};

  // Create a copy to avoid modifying the original
  const sanitized = { ...details };

  // Sanitize email addresses if present
  if (sanitized.email) {
    // Only keep domain part of email for logging
    const parts = sanitized.email.split("@");
    if (parts.length === 2) {
      sanitized.emailDomain = parts[1];
    }
    delete sanitized.email;
  }

  // Truncate long fields
  if (sanitized.userAgent && sanitized.userAgent.length > 200) {
    sanitized.userAgent = sanitized.userAgent.substring(0, 200);
  }

  // Remove sensitive data
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.refreshToken;
  delete sanitized.idToken;
  delete sanitized.accessToken;

  return sanitized;
}

// Note: For a production Firebase app, consider implementing a Cloud Function
// that processes security logs and sends alerts for critical events
