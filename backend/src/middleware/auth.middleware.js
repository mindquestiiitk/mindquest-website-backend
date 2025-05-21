/**
 * Authentication Middleware
 * Verifies Firebase ID tokens from client-side authentication
 */

import { auth, db } from "../config/firebase.config.js";
import { AppError, catchAsync } from "../utils/error.js";
import logger from "../utils/logger.js";
import { documentExists } from "../utils/firebase-utils.js";

/**
 * Middleware to verify Firebase ID tokens
 */
export const authMiddleware = catchAsync(async (req, res, next) => {
  // Get the ID token from multiple sources
  let idToken = null;

  // First try Authorization header (preferred method)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    idToken = authHeader.split("Bearer ")[1];
  }

  // If no token in Authorization header, try cookies
  if (!idToken && req.cookies && req.cookies.token) {
    idToken = req.cookies.token;
    logger.debug("Using token from cookies instead of Authorization header", {
      path: req.path,
      tokenLength: idToken?.length || 0,
    });
  }

  // In development, also allow token in query parameter
  if (
    !idToken &&
    process.env.NODE_ENV === "development" &&
    req.query &&
    req.query.token
  ) {
    idToken = req.query.token;
    logger.debug("Development mode: Using token from query parameter", {
      path: req.path,
      tokenLength: idToken?.length || 0,
    });
  }

  if (!idToken) {
    logger.warn("No token provided", {
      path: req.path,
      hasAuthHeader: !!req.headers.authorization,
      hasCookies: !!req.cookies,
      hasQueryToken: !!(req.query && req.query.token),
    });
    throw new AppError(
      401,
      "No authentication token provided. Please login again.",
      "no_token"
    );
  }

  try {
    // Add more detailed logging for token debugging in development
    if (process.env.NODE_ENV === "development") {
      try {
        // Simple decode without verification for debugging
        const tokenParts = idToken.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(tokenParts[1], "base64").toString()
          );
          logger.debug("Token payload for debugging:", {
            uid: payload.uid || payload.sub || "missing",
            email: payload.email ? "present" : "missing",
            exp: payload.exp
              ? new Date(payload.exp * 1000).toISOString()
              : "missing",
            iat: payload.iat
              ? new Date(payload.iat * 1000).toISOString()
              : "missing",
          });
        }
      } catch (decodeError) {
        logger.warn(
          "Failed to decode token for debugging:",
          decodeError.message
        );
      }
    }

    // Verify the ID token with multiple retries in development mode
    let decodedToken;
    let retries = process.env.NODE_ENV === "development" ? 3 : 1;
    let lastError = null;

    while (retries > 0) {
      try {
        decodedToken = await auth.verifyIdToken(idToken);
        break; // Success, exit the loop
      } catch (verifyError) {
        lastError = verifyError;
        logger.warn(
          `Token verification attempt failed (retries left: ${retries - 1})`,
          {
            error: verifyError.message,
            code: verifyError.code,
            path: req.path,
          }
        );

        // Only retry in development mode
        if (process.env.NODE_ENV === "development" && retries > 1) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        retries--;
      }
    }

    // If all retries failed, throw the last error
    if (!decodedToken) {
      throw (
        lastError || new Error("Failed to verify token after multiple attempts")
      );
    }

    // Check if token is expired
    const tokenExpiration = decodedToken.exp * 1000; // Convert to milliseconds
    if (Date.now() >= tokenExpiration) {
      logger.warn("Token expired", { path: req.path, uid: decodedToken.uid });
      throw new AppError(
        401,
        "Authentication token expired. Please login again.",
        "token_expired"
      );
    }

    // Get user from Firestore
    let userDoc = await db.collection("users").doc(decodedToken.uid).get();

    // In development mode, create the user if it doesn't exist
    if (!userDoc.exists) {
      if (process.env.NODE_ENV === "development") {
        logger.warn(
          "User not found for token in development mode, creating it",
          {
            uid: decodedToken.uid,
            path: req.path,
          }
        );

        // Create a basic user profile
        try {
          await db
            .collection("users")
            .doc(decodedToken.uid)
            .set({
              email: decodedToken.email || "",
              name:
                decodedToken.name ||
                decodedToken.email?.split("@")[0] ||
                "User",
              role: "user",
              emailVerified: decodedToken.email_verified || false,
              avatarId: "default",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastActive: new Date().toISOString(),
            });

          // Get the newly created user
          const newUserDoc = await db
            .collection("users")
            .doc(decodedToken.uid)
            .get();
          if (newUserDoc.exists) {
            logger.info("Created user profile in development mode", {
              uid: decodedToken.uid,
              path: req.path,
            });
            userDoc = newUserDoc;
          } else {
            throw new Error("Failed to create user profile");
          }
        } catch (createError) {
          logger.error("Failed to create user profile in development mode", {
            error: createError.message,
            uid: decodedToken.uid,
            path: req.path,
          });
          throw new AppError(
            401,
            "User not found and could not be created",
            "user_not_found"
          );
        }
      } else {
        logger.warn("User not found for token", {
          uid: decodedToken.uid,
          path: req.path,
        });
        throw new AppError(
          401,
          "User not found. Please login again.",
          "user_not_found"
        );
      }
    }

    const userData = userDoc.data();

    // Add user to request
    req.user = {
      id: decodedToken.uid,
      email: decodedToken.email,
      name: userData.name,
      role: userData.role || "user",
      emailVerified: decodedToken.email_verified,
      provider: userData.provider || "password",
      avatarId: userData.avatarId || "default",
    };

    // Log authentication success
    logger.debug("User authenticated via Firebase token", {
      userId: req.user.id,
      role: req.user.role,
      path: req.path,
    });

    next();
  } catch (error) {
    // Handle Firebase auth errors
    logger.error("Token verification error", {
      error: error.message,
      code: error.code,
      path: req.path,
      stack: error.stack,
    });

    // Map Firebase auth errors to user-friendly messages
    let statusCode = 401;
    let message = "Invalid authentication token. Please login again.";
    let errorCode = "invalid_token";

    switch (error.code) {
      case "auth/id-token-expired":
        message = "Authentication token expired. Please login again.";
        errorCode = "token_expired";
        break;
      case "auth/id-token-revoked":
        message = "Authentication token has been revoked. Please login again.";
        errorCode = "token_revoked";
        break;
      case "auth/invalid-id-token":
        message = "Invalid authentication token. Please login again.";
        errorCode = "invalid_token";
        break;
      case "auth/user-disabled":
        message = "User account has been disabled. Please contact support.";
        errorCode = "user_disabled";
        break;
      case "auth/user-not-found":
        message = "User not found. Please login again.";
        errorCode = "user_not_found";
        break;
      case "auth/argument-error":
        message = "Invalid authentication token format. Please login again.";
        errorCode = "invalid_token_format";
        break;
      case "auth/network-request-failed":
        message =
          "Network error while verifying authentication. Please try again.";
        errorCode = "network_error";
        break;
      case "auth/requires-recent-login":
        message = "This action requires a recent login. Please login again.";
        errorCode = "requires_recent_login";
        break;
      case "auth/internal-error":
        message = "Authentication service error. Please try again later.";
        errorCode = "internal_error";
        break;
      default:
        // For unknown errors, provide more details in development mode
        if (process.env.NODE_ENV === "development") {
          message = `Authentication error: ${error.message}. Please login again.`;
          logger.debug("Detailed auth error in development mode", {
            error: error.message,
            stack: error.stack,
            path: req.path,
          });
        }
        break;
    }

    // In development mode, add a retry-after header to help client retry
    if (process.env.NODE_ENV === "development") {
      res.set("Retry-After", "5");
      res.set("X-Auth-Error-Code", errorCode);
    }

    throw new AppError(statusCode, message, errorCode);
  }
});

/**
 * Authorize by role middleware
 * Checks if authenticated user has required role
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} - Express middleware
 */
export const authorize = (roles = []) => {
  return catchAsync(async (req, res, next) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required", "auth_required");
    }

    // Convert single role to array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      logger.warn("Authorization failed - insufficient role", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      throw new AppError(
        403,
        "You don't have permission to access this resource",
        "insufficient_permissions"
      );
    }

    next();
  });
};

/**
 * Authorize admin middleware
 * Checks if user exists in admins collection
 */
export const authorizeAdmin = catchAsync(async (req, res, next) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required", "auth_required");
  }

  // Check if user exists in admins collection
  const isAdmin = await documentExists(db, "admins", req.user.id);

  if (!isAdmin) {
    logger.warn("Admin authorization failed", {
      userId: req.user.id,
      path: req.path,
    });

    throw new AppError(403, "Admin access required", "admin_required");
  }

  // Add admin flag to user object
  req.user.isAdmin = true;

  logger.debug("Admin authorized", { userId: req.user.id });
  next();
});
