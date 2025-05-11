/**
 * Authentication middleware
 * Provides JWT authentication and role-based authorization
 */

import jwt from "jsonwebtoken";
import { AppError, catchAsync } from "../utils/error.js";
import { AuthService } from "../services/auth.service.js";
import config from "../config/config.js";
import logger from "../utils/logger.js";
import { documentExists } from "../utils/firebase-utils.js";
import { db } from "../config/firebase.config.js";

const authService = new AuthService();

/**
 * Authenticate user middleware
 * Verifies JWT token and attaches user to request
 */
export const authMiddleware = catchAsync(async (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(
      401,
      "No authentication token provided",
      "token_missing"
    );
  }

  const token = authHeader.split(" ")[1];

  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
    logger.debug("Token verified successfully", { userId: decoded.id });
  } catch (verifyError) {
    logger.warn("Token verification failed", {
      error: verifyError.message,
      name: verifyError.name,
    });

    if (verifyError.name === "JsonWebTokenError") {
      throw new AppError(401, "Invalid authentication token", "token_invalid");
    } else if (verifyError.name === "TokenExpiredError") {
      throw new AppError(
        401,
        "Authentication token has expired",
        "token_expired"
      );
    }

    throw new AppError(401, "Authentication failed", "auth_failed");
  }

  // Get user
  const user = await authService.getUserById(decoded.id);
  if (!user) {
    logger.warn("User not found for token", { userId: decoded.id });
    throw new AppError(401, "User not found", "user_not_found");
  }

  // Add user to request
  req.user = user;

  // Log authentication success
  logger.debug("User authenticated", {
    userId: user.id,
    role: user.role,
    path: req.path,
  });

  next();
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
      throw new AppError(401, "Not authenticated", "not_authenticated");
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
        "You do not have permission to perform this action",
        "insufficient_role"
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
    throw new AppError(401, "Not authenticated", "not_authenticated");
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

  logger.debug("Admin authorized", { userId: req.user.id });
  next();
});
