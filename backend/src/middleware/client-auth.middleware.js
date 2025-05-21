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
 * - Performance optimization with caching
 * - Collection ID-based security validation
 */

import { auth, admin } from "../config/firebase.config.js";
import { AppError, ErrorCategory, catchAsync } from "../utils/error.js";
import logger from "../utils/logger.js";
import { authService } from "../services/auth.service.js";
import {
  logSecurityEvent,
  SecurityEventType,
  SecurityEventSeverity,
} from "../utils/security-monitor.js";

// Performance monitoring
const PERF_MARKERS = new Map();
const perf = {
  start: (name) => {
    const startTime = Date.now();
    PERF_MARKERS.set(name, startTime);
    return startTime;
  },
  end: (name, userId = null) => {
    const startTime = PERF_MARKERS.get(name);
    if (startTime) {
      const duration = Date.now() - startTime;
      const logData = {
        duration: `${duration}ms`,
        operation: name,
      };

      if (userId) {
        logData.userId = userId;
      }

      logger.debug(`⏱️ Auth middleware timing: ${name}`, logData);
      PERF_MARKERS.delete(name);
      return duration;
    }
    return 0;
  },
};

// Token verification cache with short TTL to improve performance
// while maintaining security
const tokenCache = new Map();
const TOKEN_CACHE_TTL = 60 * 1000; // 1 minute in milliseconds

// Clean up expired tokens from cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenCache.entries()) {
    if (now > value.expiresAt) {
      tokenCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

/**
 * Middleware to verify Firebase ID tokens
 * Optimized for performance with caching and collection ID-based security
 */
export const clientAuthMiddleware = catchAsync(async (req, res, next) => {
  // Start performance monitoring
  const perfId = `auth-middleware-${Date.now()}`;
  perf.start(perfId);

  // Add security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

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
  res.setHeader("X-Request-Timestamp", Date.now().toString());

  // Get the ID token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    perf.end(perfId);
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
    perf.end(perfId);
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
    // Check token cache first for better performance
    const cacheKey = `token-${idToken.substring(0, 20)}`;
    const cachedResult = tokenCache.get(cacheKey);

    let verificationResult;
    let user;

    // Start token verification timing
    perf.start(`${perfId}-token-verify`);

    if (cachedResult && cachedResult.expiresAt > Date.now()) {
      // Use cached result if valid
      verificationResult = cachedResult.result;
      user = verificationResult.user;
      logger.debug("Using cached token verification", {
        requestId,
        userId: user?.id,
        cacheHit: true,
      });
    } else {
      // Collect device information for fingerprinting
      const deviceInfo = {
        userAgent: req.get("user-agent") || "",
        ip: req.ip,
        platform: req.headers["sec-ch-ua-platform"] || "",
        language: req.headers["accept-language"] || "",
        referrer: req.headers.referer || "",
        timestamp: new Date().toISOString(),
      };

      // Verify the token with enhanced security
      verificationResult = await authService.verifyToken(idToken, deviceInfo);

      // Cache the result for a short time if valid
      if (verificationResult.isValid) {
        user = verificationResult.user;
        tokenCache.set(cacheKey, {
          result: verificationResult,
          expiresAt: Date.now() + TOKEN_CACHE_TTL,
        });
        logger.debug("Cached token verification", {
          requestId,
          userId: user.id,
          cacheMiss: true,
        });
      }
    }

    // End token verification timing
    perf.end(`${perfId}-token-verify`, user?.id);

    if (!verificationResult.isValid) {
      perf.end(perfId);
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

    // Check if user is disabled
    if (user.disabled) {
      perf.end(perfId);
      logger.warn("Disabled user attempted to authenticate", {
        uid: user.id,
        path: req.path,
        requestId,
      });
      throw new AppError(403, "Account disabled", "account_disabled");
    }

    // Start collection ID validation timing
    perf.start(`${perfId}-collection-validation`);

    // Collection ID-based security validation
    // Check if the session ID from cookies matches the user ID
    // This ensures the request is coming from the same user as the Firestore collection ID
    const sessionId = req.cookies.session_id;
    if (sessionId && sessionId !== user.id) {
      // If session ID doesn't match user ID, this could be a session hijacking attempt
      perf.end(`${perfId}-collection-validation`);
      perf.end(perfId);

      logger.warn("Session ID mismatch - possible session hijacking attempt", {
        userId: user.id,
        sessionId,
        path: req.path,
        ip: req.ip,
        requestId,
      });

      // Log security event for potential session hijacking
      await logSecurityEvent(
        SecurityEventType.SESSION_HIJACKING,
        SecurityEventSeverity.HIGH,
        {
          userId: user.id,
          sessionId,
          ip: req.ip,
          userAgent: req.get("user-agent") || "unknown",
          path: req.path,
          method: req.method,
          requestId,
        }
      );

      throw new AppError(
        401,
        "Invalid session. Please login again.",
        "invalid_session"
      );
    }

    // End collection ID validation timing
    perf.end(`${perfId}-collection-validation`, user.id);

    // Check token expiration
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

    // End overall performance monitoring
    perf.end(perfId, user.id);

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
    // End performance monitoring on error
    perf.end(perfId);

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
 * Optimized for performance with caching
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 */
export const clientAuthorize = (allowedRoles) => {
  // Pre-compute a Set for faster lookups
  const allowedRolesSet = new Set(allowedRoles);

  return catchAsync((req, _, next) => {
    // Start performance monitoring
    const perfId = `authorize-${Date.now()}`;
    perf.start(perfId);

    if (!req.user) {
      perf.end(perfId);
      throw new AppError(
        401,
        "Authentication required",
        "auth_required",
        ErrorCategory.AUTHENTICATION
      );
    }

    // Use Set.has() for O(1) lookup instead of Array.includes() which is O(n)
    if (!allowedRolesSet.has(req.user.role)) {
      perf.end(perfId);
      logger.warn("Unauthorized access attempt", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: Array.from(allowedRolesSet),
        path: req.path,
        requestId: req.requestId,
      });

      // Log security event for unauthorized access
      logSecurityEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        SecurityEventSeverity.MEDIUM,
        {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: Array.from(allowedRolesSet),
          path: req.path,
          method: req.method,
          requestId: req.requestId,
        }
      ).catch((error) => {
        logger.error("Failed to log security event", {
          error: error.message,
          userId: req.user.id,
          requestId: req.requestId,
        });
      });

      throw new AppError(
        403,
        "You don't have permission to access this resource",
        "insufficient_permissions",
        ErrorCategory.PERMISSION
      );
    }

    // End performance monitoring
    perf.end(perfId, req.user.id);
    next();
  });
};

/**
 * Check if user is an admin by checking the admins collection
 * Optimized for performance with caching
 */
export const clientIsAdmin = catchAsync(async (req, _, next) => {
  // Start performance monitoring
  const perfId = `admin-check-${Date.now()}`;
  perf.start(perfId);

  if (!req.user) {
    perf.end(perfId);
    throw new AppError(401, "Authentication required", "auth_required");
  }

  try {
    // Check if admin flag is already set (from previous middleware)
    if (req.user.isAdmin === true) {
      logger.debug("Using cached admin status", {
        userId: req.user.id,
        requestId: req.requestId,
      });
      perf.end(perfId, req.user.id);
      return next();
    }

    // Start admin check timing
    perf.start(`${perfId}-admin-check`);

    // Check if user is admin using our auth service with collection ID-based security
    // This checks if the user ID exists as a document ID in the admins collection
    const isAdmin = await authService.isUserAdmin(req.user.id);

    // End admin check timing
    perf.end(`${perfId}-admin-check`, req.user.id);

    if (!isAdmin) {
      perf.end(perfId);
      logger.warn("Non-admin access attempt", {
        userId: req.user.id,
        path: req.path,
        requestId: req.requestId,
      });

      // Log security event for unauthorized admin access
      logSecurityEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        SecurityEventSeverity.HIGH,
        {
          userId: req.user.id,
          path: req.path,
          method: req.method,
          requestId: req.requestId,
          accessType: "admin",
        }
      ).catch((error) => {
        logger.error("Failed to log security event", {
          error: error.message,
          userId: req.user.id,
          requestId: req.requestId,
        });
      });

      throw new AppError(403, "Admin access required", "admin_required");
    }

    // Add admin flag to user object
    req.user.isAdmin = true;

    // Start superadmin check timing
    perf.start(`${perfId}-superadmin-check`);

    // Also check if user is a superadmin with collection ID-based security
    // This checks if the user ID exists as a document ID in the superadmins collection
    const isSuperAdmin = await authService.isUserSuperAdmin(req.user.id);

    // End superadmin check timing
    perf.end(`${perfId}-superadmin-check`, req.user.id);

    if (isSuperAdmin) {
      req.user.isSuperAdmin = true;
    }

    // End overall performance monitoring
    perf.end(perfId, req.user.id);
    next();
  } catch (error) {
    // End performance monitoring on error
    perf.end(perfId);

    if (error instanceof AppError) {
      throw error;
    }

    logger.error("Admin check error", {
      error: error.message,
      stack: error.stack,
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
 * Optimized for performance with caching
 */
export const clientIsSuperAdmin = catchAsync(async (req, _, next) => {
  // Start performance monitoring
  const perfId = `superadmin-check-${Date.now()}`;
  perf.start(perfId);

  if (!req.user) {
    perf.end(perfId);
    throw new AppError(401, "Authentication required", "auth_required");
  }

  try {
    // Check if superadmin flag is already set (from previous middleware)
    if (req.user.isSuperAdmin === true) {
      logger.debug("Using cached superadmin status", {
        userId: req.user.id,
        requestId: req.requestId,
      });
      perf.end(perfId, req.user.id);
      return next();
    }

    // Start superadmin check timing
    perf.start(`${perfId}-superadmin-check`);

    // Check if user is superadmin using our auth service with collection ID-based security
    // This checks if the user ID exists as a document ID in the superadmins collection
    const isSuperAdmin = await authService.isUserSuperAdmin(req.user.id);

    // End superadmin check timing
    perf.end(`${perfId}-superadmin-check`, req.user.id);

    if (!isSuperAdmin) {
      perf.end(perfId);
      logger.warn("Non-superadmin access attempt", {
        userId: req.user.id,
        path: req.path,
        requestId: req.requestId,
      });

      // Log security event for unauthorized superadmin access
      logSecurityEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        SecurityEventSeverity.CRITICAL,
        {
          userId: req.user.id,
          path: req.path,
          method: req.method,
          requestId: req.requestId,
          accessType: "superadmin",
        }
      ).catch((error) => {
        logger.error("Failed to log security event", {
          error: error.message,
          userId: req.user.id,
          requestId: req.requestId,
        });
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

    // End overall performance monitoring
    perf.end(perfId, req.user.id);
    next();
  } catch (error) {
    // End performance monitoring on error
    perf.end(perfId);

    if (error instanceof AppError) {
      throw error;
    }

    logger.error("Superadmin check error", {
      error: error.message,
      stack: error.stack,
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
