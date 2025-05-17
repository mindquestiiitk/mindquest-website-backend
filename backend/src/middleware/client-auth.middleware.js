/**
 * Client Authentication Middleware
 *
 * Production-ready middleware that verifies Firebase ID tokens from client-side authentication
 * with enhanced security features:
 * - Token verification with Firebase Admin SDK
 * - Rate limiting for auth requests
 * - Brute force protection
 * - Token refresh handling
 * - Comprehensive error handling
 * - Detailed logging for security monitoring
 */

import { auth } from "../config/firebase.config.js";
import { AppError, ErrorCategory, catchAsync } from "../utils/error.js";
import logger from "../utils/logger.js";
import { authService } from "../services/auth.service.js";
import {
  logSecurityEvent,
  SecurityEventType,
  SecurityEventSeverity,
} from "../utils/security-monitor.js";

/**
 * Middleware to verify Firebase ID tokens
 */
export const clientAuthMiddleware = catchAsync(async (req, res, next) => {
  // Add security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Set Access-Control-Expose-Headers to expose custom headers to the client
  const exposedHeaders = res.getHeader("Access-Control-Expose-Headers") || "";
  const newExposedHeaders = exposedHeaders
    ? `${exposedHeaders}, X-Request-ID, X-Token-Expiring-Soon, X-Token-Expires-In, X-Request-Timestamp`
    : "X-Request-ID, X-Token-Expiring-Soon, X-Token-Expires-In, X-Request-Timestamp";
  res.setHeader("Access-Control-Expose-Headers", newExposedHeaders);

  // Generate request ID for tracing
  const requestId = `req-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  // Get the ID token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("No token provided", {
      path: req.path,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      requestId,
    });
    throw new AppError(401, "No authentication token provided", "no_token");
  }

  const idToken = authHeader.split("Bearer ")[1];
  if (!idToken) {
    logger.warn("Invalid token format", {
      path: req.path,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      requestId,
    });
    throw new AppError(
      401,
      "Invalid authentication token format",
      "invalid_token_format"
    );
  }

  try {
    // Collect device information for fingerprinting
    const deviceInfo = {
      userAgent: req.get("user-agent") || "",
      ip: req.ip,
      platform: req.headers["sec-ch-ua-platform"] || "",
      language: req.headers["accept-language"] || "",
    };

    // Verify the token with enhanced security
    const verificationResult = await authService.verifyToken(
      idToken,
      deviceInfo
    );

    if (!verificationResult.isValid) {
      logger.warn("Token verification failed", {
        path: req.path,
        message: verificationResult.message,
        code: verificationResult.code,
        requestId,
      });

      // Log security event
      await logSecurityEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        SecurityEventSeverity.MEDIUM,
        {
          userId: "unknown",
          ip: req.ip,
          userAgent: req.get("user-agent") || "unknown",
          path: req.path,
          method: req.method,
          code: verificationResult.code,
          message: verificationResult.message,
          requestId,
        }
      );

      throw new AppError(
        401,
        verificationResult.message || "Authentication failed",
        verificationResult.code || "auth_failed"
      );
    }

    const user = verificationResult.user;

    // Check if user is disabled
    if (user.disabled) {
      logger.warn("Disabled user attempted to authenticate", {
        uid: user.id,
        path: req.path,
        requestId,
      });
      throw new AppError(403, "Account disabled", "account_disabled");
    }

    // Check token expiration
    const sessionId = req.cookies.session_id;
    if (!sessionId) {
      // If no session cookie, check if we should refresh the token
      const decodedToken = await auth.verifyIdToken(idToken);
      const tokenExpirationSeconds = decodedToken.exp;
      const currentTimeSeconds = Math.floor(Date.now() / 1000);
      const timeToExpiration = tokenExpirationSeconds - currentTimeSeconds;

      // If token is about to expire, set header to notify client
      if (timeToExpiration < 300) {
        // Less than 5 minutes
        res.setHeader("X-Token-Expiring-Soon", "true");
        res.setHeader("X-Token-Expires-In", timeToExpiration.toString());
      }
    }

    // Add user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "user",
      emailVerified: user.emailVerified || false,
      provider: user.provider || "password",
      avatarId: user.avatarId || "default",
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };

    // Log authentication success
    logger.debug("User authenticated via secure token", {
      userId: req.user.id,
      role: req.user.role,
      path: req.path,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      requestId,
    });

    next();
  } catch (error) {
    // Handle Firebase auth errors
    logger.error("Token verification error", {
      error: error.message,
      code: error.code,
      path: req.path,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      requestId,
    });

    // Map Firebase auth errors to user-friendly messages
    let statusCode = 401;
    let message = "Invalid authentication token";
    let errorCode = "invalid_token";
    let category = ErrorCategory.AUTHENTICATION;

    switch (error.code) {
      case "auth/id-token-expired":
        message = "Authentication token expired";
        errorCode = "token_expired";
        break;
      case "auth/id-token-revoked":
        message = "Authentication token has been revoked";
        errorCode = "token_revoked";
        break;
      case "auth/invalid-id-token":
        message = "Invalid authentication token";
        errorCode = "invalid_token";
        break;
      case "auth/user-disabled":
        message = "User account has been disabled";
        errorCode = "user_disabled";
        statusCode = 403;
        category = ErrorCategory.PERMISSION;
        break;
      case "auth/user-not-found":
        message = "User not found";
        errorCode = "user_not_found";
        break;
      case "auth/argument-error":
        message = "Invalid authentication token format";
        errorCode = "invalid_token_format";
        break;
      case "auth/invalid-argument":
        message = "Invalid authentication request";
        errorCode = "invalid_request";
        break;
      case "auth/internal-error":
        message = "Authentication service error";
        errorCode = "auth_service_error";
        statusCode = 500;
        category = ErrorCategory.SERVER;
        break;
    }

    throw new AppError(statusCode, message, errorCode, category);
  }
});

/**
 * Authorization middleware to check user roles
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 */
export const clientAuthorize = (allowedRoles) => {
  return catchAsync((req, _, next) => {
    if (!req.user) {
      throw new AppError(
        401,
        "Authentication required",
        "auth_required",
        ErrorCategory.AUTHENTICATION
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn("Unauthorized access attempt", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
        requestId: req.requestId,
      });

      throw new AppError(
        403,
        "You don't have permission to access this resource",
        "insufficient_permissions",
        ErrorCategory.PERMISSION
      );
    }

    next();
  });
};

/**
 * Check if user is an admin by checking the admins collection
 */
export const clientIsAdmin = catchAsync(async (req, _, next) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required", "auth_required");
  }

  try {
    // Check if user is admin using our auth service
    const isAdmin = await authService.isUserAdmin(req.user.id);

    if (!isAdmin) {
      logger.warn("Non-admin access attempt", {
        userId: req.user.id,
        path: req.path,
        requestId: req.requestId,
      });

      throw new AppError(403, "Admin access required", "admin_required");
    }

    // Add admin flag to user object
    req.user.isAdmin = true;

    // Also check if user is a superadmin
    const isSuperAdmin = await authService.isUserSuperAdmin(req.user.id);
    if (isSuperAdmin) {
      req.user.isSuperAdmin = true;
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error("Admin check error", {
      error: error.message,
      userId: req.user.id,
      path: req.path,
      requestId: req.requestId,
    });

    throw new AppError(
      500,
      "Failed to verify admin status",
      "admin_check_failed"
    );
  }
});

/**
 * Check if user is a superadmin by checking the superadmins collection
 */
export const clientIsSuperAdmin = catchAsync(async (req, _, next) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required", "auth_required");
  }

  try {
    // Check if user is superadmin using our auth service
    const isSuperAdmin = await authService.isUserSuperAdmin(req.user.id);

    if (!isSuperAdmin) {
      logger.warn("Non-superadmin access attempt", {
        userId: req.user.id,
        path: req.path,
        requestId: req.requestId,
      });

      throw new AppError(
        403,
        "Superadmin access required",
        "superadmin_required"
      );
    }

    // Add superadmin flag to user object
    req.user.isSuperAdmin = true;
    req.user.isAdmin = true; // Superadmins are also admins

    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error("Superadmin check error", {
      error: error.message,
      userId: req.user.id,
      path: req.path,
      requestId: req.requestId,
    });

    throw new AppError(
      500,
      "Failed to verify superadmin status",
      "superadmin_check_failed"
    );
  }
});
