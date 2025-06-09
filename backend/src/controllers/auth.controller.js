/**
 * Authentication Controller
 *
 * This controller provides a consistent interface for all authentication operations,
 * using the unified authentication service.
 *
 * Optimized for production with:
 * - Performance monitoring
 * - Caching
 * - Standardized response formats
 * - Comprehensive error handling
 */

import { authService } from "../services/auth.service.js";
import { catchAsync, createError } from "../utils/error.js";
import { validateAndSanitize } from "../utils/validator.js";
import logger from "../utils/logger.js";

export class AuthController {
  constructor() {
    this.authService = authService;
  }

  /**
   * Register a new user with email and password or Firebase ID token
   * Optimized for performance and reliability
   */
  register = catchAsync(async (req, res, next) => {
    try {
      const {
        email,
        password,
        name,
        avatarId,
        idToken,
        provider,
        deviceInfo,
        emailVerified,
      } = req.body;

      // Collect device information for security and analytics
      const enhancedDeviceInfo = {
        ...(deviceInfo || {}),
        ip: req.ip,
        userAgent: req.headers["user-agent"] || "",
        referrer: req.headers.referer || "",
        timestamp: new Date().toISOString(),
      };

      // Check if we're registering with Firebase ID token or email/password
      // Also check for explicit tokenBased flag for better compatibility
      // Skip validation for token-based registration
      if (idToken || req.body.tokenBased || provider) {
        // Firebase ID token registration (from client)
        try {
          // Get token from request body or Authorization header
          let tokenToVerify = idToken;

          // If no token in body, try to get it from Authorization header
          if (!tokenToVerify && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith("Bearer ")) {
              tokenToVerify = authHeader.substring(7);
              logger.info(
                "Using token from Authorization header for registration"
              );
            }
          }

          if (!tokenToVerify) {
            return res.status(401).json({
              success: false,
              error: {
                message: "No authentication token provided",
                code: "missing_token",
              },
            });
          }

          // Verify the token
          const decodedToken = await this.authService.auth.verifyIdToken(
            tokenToVerify
          );

          if (!decodedToken || !decodedToken.uid) {
            return res.status(401).json({
              success: false,
              error: {
                message: "Invalid authentication token",
                code: "invalid_token",
              },
            });
          }

          // Check if user already exists in Firestore
          const userDoc = await this.authService.usersCollection
            .doc(decodedToken.uid)
            .get();

          if (userDoc.exists) {
            // User already exists, return success with existing user data
            logger.info("User already exists during registration", {
              userId: decodedToken.uid,
              email: decodedToken.email,
            });

            // Ensure user profile and role collections are properly set up
            await this.authService.ensureUserProfile(decodedToken.uid, {
              email: email || decodedToken.email,
              name: name || decodedToken.name,
              provider:
                provider ||
                decodedToken.firebase?.sign_in_provider ||
                "password",
              emailVerified: emailVerified || decodedToken.email_verified,
            });

            // Create or update session
            await this.authService.ensureUserSession(
              decodedToken.uid,
              enhancedDeviceInfo
            );

            // Get updated user data
            const userData = await this.authService.getUserById(
              decodedToken.uid
            );

            return res.status(200).json({
              success: true,
              message: "User already registered",
              data: { user: userData },
            });
          }

          // Create new user profile
          const userData = await this.authService.ensureUserProfile(
            decodedToken.uid,
            {
              email: email || decodedToken.email,
              name: name || decodedToken.name,
              provider:
                provider ||
                decodedToken.firebase?.sign_in_provider ||
                "password",
              emailVerified: emailVerified || decodedToken.email_verified,
              avatarId: avatarId || "default",
            }
          );

          // Create session
          await this.authService.ensureUserSession(
            decodedToken.uid,
            enhancedDeviceInfo
          );

          logger.info("User registered with Firebase token", {
            userId: decodedToken.uid,
            email: userData.email,
          });

          return res.status(201).json({
            success: true,
            data: { user: userData },
          });
        } catch (tokenError) {
          logger.error("Token-based registration error", {
            error: tokenError.message,
            code: tokenError.code,
            stack: tokenError.stack,
          });

          return res.status(401).json({
            success: false,
            error: {
              message: "Invalid or expired authentication token",
              code: tokenError.code || "invalid_token",
            },
          });
        }
      } else {
        // Traditional email/password registration
        try {
          // Use the schemas from validation-schemas.js which now handles conditional validation
          // The validation is now handled by the validateRequest middleware in routes
          // No need for additional validation here

          const result = await this.authService.registerWithEmailPassword(
            email,
            password,
            name,
            avatarId,
            enhancedDeviceInfo
          );

          res.status(201).json({
            success: true,
            data: result,
          });
        } catch (validationError) {
          // Handle validation errors specifically
          if (validationError.statusCode === 400) {
            return res.status(400).json({
              success: false,
              timestamp: new Date().toISOString(),
              errorId: `mas${Math.random().toString(36).substring(2, 12)}`,
              error: {
                message: validationError.message,
                code: "validation_error",
                details: {
                  password:
                    "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
                },
              },
            });
          }

          // Rethrow other errors to be handled by the catch block
          throw validationError;
        }
      }
    } catch (error) {
      logger.error("Registration error", {
        error: error.message,
        code: error.code,
        email: req.body.email,
        stack: error.stack,
      });
      next(error);
    }
  });

  /**
   * Login with email and password
   * Optimized for performance and security
   */
  login = catchAsync(async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Validation is handled by middleware

      // Log login attempt for debugging (with limited PII)
      logger.debug("Login attempt", {
        emailDomain: email.split("@")[1] || "unknown",
        ip: req.ip,
        userAgent: req.headers["user-agent"]?.substring(0, 50) || "",
      });

      // Collect device information for fingerprinting and security
      const deviceInfo = {
        userAgent: req.headers["user-agent"] || "",
        ip: req.ip,
        platform: req.headers["sec-ch-ua-platform"] || "",
        language: req.headers["accept-language"] || "",
        timezone: req.body.timezone || "",
        screenResolution: req.body.screenResolution || "",
        referrer: req.headers.referer || "",
        timestamp: new Date().toISOString(),
      };

      const result = await this.authService.loginWithEmailPassword(
        email,
        password,
        deviceInfo
      );

      // Ensure a session document exists in Firestore
      try {
        // Use our dedicated helper method to ensure session exists
        const sessionResult = await this.authService.ensureUserSession(
          result.user.id,
          deviceInfo
        );

        // Also ensure the user profile is properly set up
        await this.authService.ensureUserProfile(result.user.id, {
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          emailVerified: result.user.emailVerified,
        });

        // If the user is an admin or superadmin, ensure admin status is properly set
        if (result.user.role === "admin" || result.user.role === "superadmin") {
          await this.authService.ensureAdminStatus(
            result.user.id,
            result.user.role
          );
        }

        // Update the result with the session ID if needed
        if (!result.sessionId && sessionResult.sessionId) {
          result.sessionId = sessionResult.sessionId;
        }

        logger.info("Session and user profile ensured during login", {
          userId: result.user.id,
          sessionId: result.sessionId || sessionResult.sessionId,
        });
      } catch (sessionError) {
        // Log the error but don't fail the login
        logger.error("Error managing session and profile during login", {
          error: sessionError.message,
          userId: result.user.id,
        });
      }

      // Set secure HTTP-only cookie with refresh token
      // Use SameSite=Lax for better compatibility with modern browsers while maintaining security
      res.cookie("refresh_token", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // Changed from strict to lax for better compatibility
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
        path: "/auth/refresh-token",
      });

      // Set session ID in cookie
      res.cookie("session_id", result.sessionId || result.user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // Changed from strict to lax for better compatibility
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
      });

      // Don't include refresh token in response body for security
      const responseData = {
        ...result,
        refreshToken: undefined,
      };

      res.json({
        success: true,
        data: {
          user: responseData.user,
          token: responseData.token,
          sessionId: responseData.sessionId,
        },
      });

      logger.info("Login successful", {
        userId: result.user.id,
        email: result.user.email,
      });
    } catch (error) {
      // Provide user-friendly error messages
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        return res.status(401).json({
          success: false,
          error: {
            message: "Invalid email or password",
            code: "invalid_credentials",
          },
        });
      }

      if (error.code === "auth/too-many-requests") {
        return res.status(429).json({
          success: false,
          error: {
            message:
              "Too many login attempts. Please try again later or reset your password.",
            code: "too_many_attempts",
          },
        });
      }

      logger.error("Login error", {
        error: error.message,
        code: error.code,
        email: req.body.email,
        stack: error.stack,
      });
      next(error);
    }
  });

  /**
   * Logout the current user
   */
  logout = catchAsync(async (req, res, next) => {
    try {
      // Get session ID and refresh token from cookies
      const sessionId = req.cookies.session_id;
      const refreshToken = req.cookies.refresh_token;

      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        logger.warn("Logout attempt without authentication", {
          sessionId,
          hasRefreshToken: !!refreshToken,
          ip: req.ip,
          userAgent: req.headers["user-agent"]?.substring(0, 50) || "",
        });

        // Clear cookies anyway
        res.clearCookie("refresh_token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/auth/refresh-token",
        });

        res.clearCookie("session_id", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
        });

        // Return success even though the user wasn't authenticated
        // This prevents information leakage about authentication state
        return res.json({
          success: true,
          message: "No active session to logout",
        });
      }

      // Logout the user
      await this.authService.logout(req.user.id, sessionId, refreshToken);

      // Clear cookies
      res.clearCookie("refresh_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/auth/refresh-token",
      });

      res.clearCookie("session_id", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      logger.error("Logout error", {
        error: error.message,
        userId: req.user?.id,
      });

      // Even if there's an error, clear cookies to ensure the user is logged out
      res.clearCookie("refresh_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/auth/refresh-token",
      });

      res.clearCookie("session_id", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      next(error);
    }
  });

  /**
   * Get the current user's profile
   */
  getCurrentUser = catchAsync(async (req, res, next) => {
    try {
      const user = await this.authService.getUserById(req.user.id);

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      logger.error("Get current user error", {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  });

  /**
   * Update the current user's profile
   */
  updateProfile = catchAsync(async (req, res, next) => {
    try {
      const { name, email, avatarId, bio, socialLinks } = req.body;

      // Validate request
      const validatedData = validateAndSanitize(req.body, {
        name: { type: "string", required: false },
        email: { type: "string", required: false },
        avatarId: { type: "string", required: false },
        bio: { type: "string", required: false },
        socialLinks: { type: "object", required: false },
      });

      // Validate social links if provided
      if (socialLinks) {
        this.validateSocialLinks(socialLinks);
      }

      const user = await this.authService.updateUserProfile(req.user.id, {
        name,
        email,
        avatarId,
        bio,
        socialLinks,
      });

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      logger.error("Update profile error", {
        error: error.message,
        userId: req.user?.id,
        updates: req.body,
      });
      next(error);
    }
  });

  /**
   * Validate social media links
   * @private
   */
  validateSocialLinks(socialLinks) {
    const allowedPlatforms = [
      "linkedin",
      "twitter",
      "instagram",
      "github",
      "website",
      "facebook",
      "youtube",
    ];
    const urlRegex =
      /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

    for (const [platform, url] of Object.entries(socialLinks)) {
      if (!allowedPlatforms.includes(platform)) {
        throw createError(400, `Invalid social media platform: ${platform}`);
      }

      if (url && typeof url === "string" && url.trim() !== "") {
        if (!urlRegex.test(url)) {
          throw createError(400, `Invalid URL format for ${platform}: ${url}`);
        }

        // Platform-specific validation
        if (platform === "linkedin" && !url.includes("linkedin.com")) {
          throw createError(400, "LinkedIn URL must be from linkedin.com");
        }
        if (
          platform === "twitter" &&
          !url.includes("twitter.com") &&
          !url.includes("x.com")
        ) {
          throw createError(
            400,
            "Twitter URL must be from twitter.com or x.com"
          );
        }
        if (platform === "instagram" && !url.includes("instagram.com")) {
          throw createError(400, "Instagram URL must be from instagram.com");
        }
        if (platform === "github" && !url.includes("github.com")) {
          throw createError(400, "GitHub URL must be from github.com");
        }
        if (platform === "facebook" && !url.includes("facebook.com")) {
          throw createError(400, "Facebook URL must be from facebook.com");
        }
        if (
          platform === "youtube" &&
          !url.includes("youtube.com") &&
          !url.includes("youtu.be")
        ) {
          throw createError(
            400,
            "YouTube URL must be from youtube.com or youtu.be"
          );
        }
      }
    }
  }

  /**
   * Send a password reset email
   */
  forgotPassword = catchAsync(async (req, res, next) => {
    try {
      const { email } = req.body;

      // Validate request
      const validatedData = validateAndSanitize(req.body, {
        email: { type: "string", required: true },
      });

      await this.authService.sendPasswordResetEmail(email);

      res.json({
        success: true,
        message: "Password reset email sent",
      });
    } catch (error) {
      logger.error("Forgot password error", {
        error: error.message,
        email: req.body.email,
      });
      next(error);
    }
  });

  /**
   * Reset password with token
   */
  resetPassword = catchAsync(async (req, res, next) => {
    try {
      const { token, password } = req.body;

      // Validate request
      const validatedData = validateAndSanitize(req.body, {
        token: { type: "string", required: true },
        password: { type: "string", required: true, min: 6 },
      });

      await this.authService.resetPassword(token, password);

      res.json({
        success: true,
        message: "Password reset successful",
      });
    } catch (error) {
      logger.error("Reset password error", {
        error: error.message,
      });
      next(error);
    }
  });

  /**
   * Verify a token
   */
  verifyToken = catchAsync(async (req, res) => {
    try {
      // Get token from Authorization header (production-ready approach)
      const authHeader = req.headers.authorization;
      let token = null;

      // First try to get token from Authorization header
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
      // Fallback to token in cookies (for cross-origin requests)
      else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
        logger.debug(
          "Using token from cookies instead of Authorization header"
        );
      }
      // In development, also allow token in query parameter
      else if (
        process.env.NODE_ENV === "development" &&
        req.query &&
        req.query.token
      ) {
        token = req.query.token;
        logger.debug("Development mode: Using token from query parameter");
      }

      if (!token) {
        logger.warn("Token verification failed: No valid token found", {
          headers: Object.keys(req.headers),
          hasAuthHeader: !!req.headers.authorization,
          hasCookies: !!req.cookies,
          hasQueryToken: !!(req.query && req.query.token),
        });

        return res.status(401).json({
          success: false,
          error: {
            message: "No valid token found. Please login again.",
            code: "no_token",
          },
        });
      }

      // Token is already validated above, no need for this check

      // For development environment, add more detailed logging
      if (process.env.NODE_ENV === "development") {
        logger.debug("Token verification request details:", {
          headers: {
            authorization: authHeader
              ? `Bearer ${token.substring(0, 10)}...`
              : "none",
            "user-agent": req.headers["user-agent"]?.substring(0, 50) || "none",
            "content-type": req.headers["content-type"] || "none",
            accept: req.headers["accept"] || "none",
            origin: req.headers["origin"] || "none",
            referer: req.headers["referer"] || "none",
          },
          ip: req.ip,
          method: req.method,
          path: req.path,
          tokenLength: token?.length || 0,
        });
      }

      // Collect device information for fingerprinting
      const deviceInfo = {
        userAgent: req.headers["user-agent"] || "",
        ip: req.ip || req.connection.remoteAddress || "",
        platform: req.headers["sec-ch-ua-platform"] || "",
        language: req.headers["accept-language"] || "",
        timezone: req.body.timezone || "",
        screenResolution: req.body.screenResolution || "",
      };

      // Log token details for debugging (without exposing the full token)
      logger.debug("Verifying token", {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 10) + "...",
        deviceInfo: {
          ip: deviceInfo.ip,
          platform: deviceInfo.platform,
        },
      });

      // For development environment, add extra logging
      if (process.env.NODE_ENV === "development") {
        try {
          // Decode the token without verification to see what's in it
          // This is safe in development only
          const decodedToken = this.authService.decodeToken(token);
          logger.debug("Development mode - Decoded token:", {
            uid: decodedToken?.uid || decodedToken?.sub,
            email: decodedToken?.email ? "present" : "missing",
            exp: decodedToken?.exp
              ? new Date(decodedToken.exp * 1000).toISOString()
              : "missing",
            iat: decodedToken?.iat
              ? new Date(decodedToken.iat * 1000).toISOString()
              : "missing",
          });
        } catch (decodeError) {
          logger.warn("Failed to decode token for debugging", {
            error: decodeError.message,
          });
        }
      }

      const result = await this.authService.verifyToken(token, deviceInfo);

      if (!result.isValid) {
        logger.warn("Token verification failed", {
          reason: result.message,
          code: result.code,
        });

        return res.status(401).json({
          success: false,
          error: {
            message: result.message,
            code: result.code || "invalid_token",
          },
        });
      }

      // Ensure a session document exists in Firestore for this user
      try {
        if (result.user && result.user.id) {
          // Use our dedicated helper method to ensure session exists
          // This is crucial for collection-based security
          await this.authService.ensureUserSession(result.user.id, deviceInfo);

          // Set the session ID to the user's UID for collection-based security
          result.sessionId = result.user.id;

          // Also ensure the user profile is properly set up
          await this.authService.ensureUserProfile(result.user.id, {
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
            emailVerified: result.user.emailVerified,
          });

          // If the user is an admin or superadmin, ensure admin status is properly set
          // This creates the necessary documents in the admin/superadmin collections
          // which is crucial for collection-based security
          if (
            result.user.role === "admin" ||
            result.user.role === "superadmin"
          ) {
            await this.authService.ensureAdminStatus(
              result.user.id,
              result.user.role
            );
          }

          logger.info(
            "Session and user profile ensured for collection-based security",
            {
              userId: result.user.id,
              sessionId: result.user.id,
              role: result.user.role,
            }
          );
        }
      } catch (sessionError) {
        // Log the error but don't fail the verification
        logger.error(
          "Error managing session document during token verification",
          {
            error: sessionError.message,
            userId: result.user?.id,
          }
        );
      }

      // Include user data in the response
      res.json({
        success: true,
        data: {
          ...result,
          user: {
            id: result.user?.id || "",
            email: result.user?.email || "",
            displayName: result.user?.name || "",
            name: result.user?.name || "",
            role: result.user?.role || "user",
            isAdmin:
              result.user?.role === "admin" ||
              result.user?.role === "superadmin" ||
              false,
            emailVerified: result.user?.emailVerified || false,
            photoURL: result.user?.photoURL || null,
          },
        },
      });

      logger.debug("Token verification successful", {
        userId: result.user?.id,
        role: result.user?.role,
      });
    } catch (error) {
      logger.error("Token verification error", {
        error: error.message,
        code: error.code,
        stack: error.stack,
      });

      // Send a more helpful error response
      return res.status(500).json({
        success: false,
        error: {
          message: "Internal server error during token verification",
          code: error.code || "server_error",
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        },
      });
    }
  });

  /**
   * Refresh access token using refresh token
   */
  refreshToken = catchAsync(async (req, res, next) => {
    try {
      // Get refresh token from cookie
      const refreshToken = req.cookies.refresh_token;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: {
            message: "No refresh token provided",
            code: "no_refresh_token",
          },
        });
      }

      // Collect device information for fingerprinting
      const deviceInfo = {
        userAgent: req.headers["user-agent"] || "",
        ip: req.ip,
        platform: req.headers["sec-ch-ua-platform"] || "",
        language: req.headers["accept-language"] || "",
        timezone: req.body.timezone || "",
        screenResolution: req.body.screenResolution || "",
      };

      // Refresh the token
      const result = await this.authService.refreshAccessToken(
        refreshToken,
        deviceInfo
      );

      // Set new refresh token in cookie
      res.cookie("refresh_token", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
        path: "/auth/refresh-token",
      });

      // Set new session ID in cookie
      res.cookie("session_id", result.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
      });

      // Don't include refresh token in response body for security
      const responseData = {
        ...result,
        refreshToken: undefined,
      };

      res.json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      logger.error("Token refresh error", {
        error: error.message,
        code: error.code,
      });

      // Clear cookies on error
      res.clearCookie("refresh_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/auth/refresh-token",
      });

      res.clearCookie("session_id", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      next(error);
    }
  });

  /**
   * Update a user's role (admin only)
   */
  updateUserRole = catchAsync(async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      // Validate request
      const validatedData = validateAndSanitize(req.body, {
        role: { type: "string", required: true },
      });

      const result = await this.authService.updateUserRole(userId, role);

      res.json({
        success: true,
        data: result,
        message: "User role updated successfully",
      });
    } catch (error) {
      logger.error("Update user role error", {
        error: error.message,
        userId: req.params.userId,
        role: req.body.role,
      });
      next(error);
    }
  });

  /**
   * Delete the current user's account
   */
  deleteAccount = catchAsync(async (req, res, next) => {
    try {
      const { password, reason } = req.body;

      // Validate request is handled by middleware

      // Delete user from Firebase and database
      await this.authService.deleteUser(req.user.id, password, reason);

      res.json({
        success: true,
        message: "Account deleted successfully",
      });
    } catch (error) {
      logger.error("Delete account error", {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  });

  /**
   * Verify email with verification code
   */
  verifyEmail = catchAsync(async (req, res, next) => {
    try {
      const { code } = req.body;

      // Validate request is handled by middleware

      // Verify email with the provided code
      await this.authService.verifyEmail(code);

      res.json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error) {
      logger.error("Email verification error", {
        error: error.message,
        code: error.code,
      });
      next(error);
    }
  });

  /**
   * Change user password
   */
  changePassword = catchAsync(async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Validate request is handled by middleware

      // Change password
      await this.authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      logger.error("Password change error", {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  });
}
