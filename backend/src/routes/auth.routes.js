/**
 * Authentication Routes
 *
 * Production-ready authentication routes with:
 * - Rate limiting for sensitive operations
 * - Brute force protection
 * - CSRF protection
 * - Input validation
 * - Proper security headers
 */

import express from "express";
import { AuthController } from "../controllers/auth.controller.js";
import {
  clientAuthMiddleware,
  clientAuthorize,
} from "../middleware/client-auth.middleware.js";
import { UserRole } from "../services/auth.service.js";
import {
  arcjetProtection,
  emailDomainValidation,
} from "../middleware/arcjet.middleware.js";
import { validateRequest } from "../utils/validator.js";
import { schemas } from "../utils/validation-schemas.js";
import helmet from "helmet";
import logger from "../utils/logger.js";

const router = express.Router();
const authController = new AuthController();

// Apply security headers
router.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://storage.googleapis.com"],
        connectSrc: [
          "'self'",
          "https://*.googleapis.com",
          "https://*.firebaseio.com",
        ],
        frameSrc: ["'self'", "https://*.firebaseapp.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding of resources
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// Public routes with Arcjet protection
// Note: arcjetProtection already includes rate limiting and bot protection
router.post(
  "/register",
  arcjetProtection, // This already includes bot protection and rate limiting
  emailDomainValidation, // Additional email domain validation
  validateRequest(schemas.auth.register),
  authController.register
);

router.post(
  "/login",
  arcjetProtection, // This already includes bot protection and rate limiting
  validateRequest(schemas.auth.login),
  authController.login
);

router.post(
  "/forgot-password",
  arcjetProtection, // This already includes bot protection and rate limiting
  validateRequest(schemas.auth.forgotPassword),
  authController.forgotPassword
);

router.post(
  "/reset-password",
  arcjetProtection, // This already includes bot protection and rate limiting
  validateRequest(schemas.auth.resetPassword),
  authController.resetPassword
);

// Add special CORS handling for verify-token endpoint
router.options("/verify-token", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-request-id, x-request-timestamp, x-requested-with, accept, origin, cache-control, x-api-key"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400"); // 24 hours
  res.status(204).end();
});

// Add a test endpoint to check if the route is accessible
router.get("/test", (_, res) => {
  logger.info("Auth test endpoint accessed");
  res.status(200).json({
    success: true,
    message: "Auth routes are working correctly",
    timestamp: new Date().toISOString(),
  });
});

// Verify token endpoint - crucial for authentication
router.post(
  "/verify-token",
  (req, res, next) => {
    // Set CORS headers for this specific route
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Expose-Headers",
      "x-request-id, x-token-expiring-soon, x-token-expires-in, x-request-timestamp"
    );

    // Enhanced logging for debugging authentication issues
    const authHeader = req.headers.authorization;
    const hasValidAuthHeader =
      authHeader &&
      authHeader.startsWith("Bearer ") &&
      authHeader.split(" ")[1]?.length > 20;

    const hasCookieToken = req.cookies && req.cookies.token;
    const hasQueryToken = req.query && req.query.token;

    logger.debug("Token verification request received", {
      hasValidAuthHeader,
      hasCookieToken,
      hasQueryToken,
      origin: req.headers.origin,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      cookies: req.cookies ? Object.keys(req.cookies) : [],
      query: req.query ? Object.keys(req.query) : [],
    });

    next();
  },
  // Skip Arcjet in development to avoid rate limiting issues during testing
  (req, res, next) => {
    if (process.env.NODE_ENV === "development") {
      return next();
    }
    arcjetProtection(req, res, next);
  },
  authController.verifyToken
);

// Refresh token endpoint - protected by HTTP-only cookie
router.post("/refresh-token", arcjetProtection, authController.refreshToken);

// Protected routes - Firebase client authentication
router.get("/me", clientAuthMiddleware, authController.getCurrentUser);

router.put(
  "/me",
  clientAuthMiddleware,
  validateRequest(schemas.auth.updateProfile),
  authController.updateProfile
);

router.delete(
  "/me",
  clientAuthMiddleware,
  validateRequest(schemas.auth.deleteAccount),
  authController.deleteAccount
);

// Make logout public to allow unauthenticated users to clear cookies
router.post("/logout", authController.logout);

router.post(
  "/change-password",
  clientAuthMiddleware,
  arcjetProtection,
  validateRequest(schemas.auth.changePassword),
  authController.changePassword
);

router.post(
  "/verify-email",
  arcjetProtection,
  validateRequest(schemas.auth.verifyEmail),
  authController.verifyEmail
);

// Admin routes
router.put(
  "/role/:userId",
  arcjetProtection,
  clientAuthMiddleware,
  clientAuthorize([UserRole.ADMIN]),
  validateRequest(schemas.auth.updateRole),
  authController.updateUserRole
);

export default router;
