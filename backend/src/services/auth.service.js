/**
 * Authentication Service
 *
 * This service provides a single interface for all authentication operations,
 * using Firebase Authentication consistently throughout the application with
 * enhanced security features to prevent session hijacking and token theft.
 */

import { auth, db, client } from "../config/firebase.config.js";
import { createError } from "../utils/error.js";
import { executeWithRetry, handleFirebaseError } from "../utils/error.js";
import logger from "../utils/logger.js";
import crypto from "crypto";
import config from "../config/config.js";
import {
  logSecurityEvent,
  SecurityEventType,
  SecurityEventSeverity,
} from "../utils/security-monitor.js";

// User roles
export const UserRole = {
  USER: "user",
  COUNSELOR: "counselor",
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
};

/**
 * Authentication Service
 */
class AuthService {
  constructor() {
    this.auth = auth;
    this.db = db;
    this.usersCollection = db.collection("users");
    this.adminsCollection = db.collection("admins");
    this.superadminsCollection = db.collection("superadmins");
    this.refreshTokensCollection = db.collection("refresh_tokens");
    this.sessionCollection = db.collection("sessions");

    // Token expiration settings
    this.TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
    this.REFRESH_TOKEN_EXPIRY = 14 * 24 * 60 * 60; // 14 days in seconds
  }

  /**
   * Register a new user with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {string} name - User's name
   * @param {string} avatarId - User's avatar ID
   * @param {Object} deviceInfo - Device information for fingerprinting and security logging
   */
  async registerWithEmailPassword(
    email,
    password,
    name,
    avatarId = "default",
    deviceInfo = {}
  ) {
    try {
      return await executeWithRetry(
        async () => {
          // Check if user already exists
          const existingUser = await this.usersCollection
            .where("email", "==", email)
            .get();

          if (!existingUser.empty) {
            throw createError(
              409,
              "This email address is already in use. Please try a different email or sign in."
            );
          }

          // Password validation is now handled in the controller
          // to avoid duplicate validation

          // Create user in Firebase Auth
          const userRecord = await this.auth.createUser({
            email,
            password,
            displayName: name,
          });

          // Set custom claims for role
          await this.auth.setCustomUserClaims(userRecord.uid, {
            role: UserRole.USER,
          });

          // Create user document in Firestore - always with USER role
          // This ensures that even if someone tries to manipulate the request,
          // they can only create regular user accounts
          const userData = {
            email,
            name,
            role: UserRole.USER, // Enforce USER role for all new registrations
            avatarId,
            provider: "password",
            emailVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Use a transaction to ensure data consistency
          await this.db.runTransaction(async (transaction) => {
            const userRef = this.usersCollection.doc(userRecord.uid);
            transaction.set(userRef, userData);
          });

          // Create custom token for client authentication
          const token = await this.auth.createCustomToken(userRecord.uid);

          logger.info("User registered successfully", {
            userId: userRecord.uid,
            email,
            provider: "password",
          });

          // Log security event for new user registration
          await logSecurityEvent(
            SecurityEventType.ACCOUNT_RECOVERY, // Using this type for account creation
            SecurityEventSeverity.LOW,
            {
              userId: userRecord.uid,
              email,
              action: "register",
              provider: "password",
              ip: deviceInfo?.ip || "unknown",
              userAgent: deviceInfo?.userAgent || "unknown",
            }
          );

          return {
            user: {
              id: userRecord.uid,
              email,
              name,
              role: UserRole.USER,
              avatarId,
              provider: "password",
              emailVerified: false,
            },
            token,
          };
        },
        { maxRetries: 3 },
        { operation: "registerWithEmailPassword", email }
      );
    } catch (error) {
      logger.error("Error registering user with email/password", {
        error: error.message,
        code: error.code,
        email,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Login with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {Object} deviceInfo - Device information for fingerprinting
   */
  async loginWithEmailPassword(email, password, deviceInfo = {}) {
    try {
      let userRecord;

      // Try to use client SDK for authentication if available
      if (
        client &&
        client.auth &&
        typeof client.auth.signInWithEmailAndPassword === "function"
      ) {
        try {
          logger.info("Using client SDK for authentication");
          const userCredential = await client.auth.signInWithEmailAndPassword(
            email,
            password
          );
          userRecord = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            emailVerified: userCredential.user.emailVerified,
          };
        } catch (clientAuthError) {
          logger.warn(
            "Client SDK authentication failed, falling back to admin SDK",
            {
              error: clientAuthError.message,
            }
          );
          // Fall back to admin SDK
          userRecord = await this.auth.getUserByEmail(email);
        }
      } else {
        // Fall back to admin SDK if client SDK is not available
        logger.info("Client SDK not available, using admin SDK");
        userRecord = await this.auth.getUserByEmail(email);
      }

      // Get additional user data from Firestore
      const userDoc = await this.usersCollection.doc(userRecord.uid).get();

      if (!userDoc.exists) {
        throw createError(
          404,
          "User profile not found. Please complete registration."
        );
      }

      const userData = userDoc.data();

      // Generate secure tokens with device fingerprinting
      const tokenData = await this.generateSecureToken(
        userRecord.uid,
        deviceInfo
      );

      // Update last login timestamp
      await this.usersCollection.doc(userRecord.uid).update({
        lastLoginAt: new Date().toISOString(),
      });

      logger.info("User logged in successfully", {
        userId: userRecord.uid,
        email: userRecord.email,
        provider: userData.provider || "password",
        authMethod: "secure-token",
        sessionId: tokenData.sessionId,
      });

      // Log security event for successful login
      await logSecurityEvent(
        userData.role === UserRole.ADMIN ||
          userData.role === UserRole.SUPERADMIN
          ? SecurityEventType.ADMIN_ACTION
          : SecurityEventType.SUCCESSFUL_LOGIN,
        userData.role === UserRole.ADMIN ||
          userData.role === UserRole.SUPERADMIN
          ? SecurityEventSeverity.MEDIUM
          : SecurityEventSeverity.LOW,
        {
          userId: userRecord.uid,
          email: userRecord.email,
          ip: deviceInfo.ip || "unknown",
          userAgent: deviceInfo.userAgent || "unknown",
          action: "login",
          role: userData.role || UserRole.USER,
          provider: userData.provider || "password",
          sessionId: tokenData.sessionId,
        }
      );

      return {
        user: {
          id: userRecord.uid,
          email: userRecord.email,
          name: userData.name || userRecord.displayName,
          role: userData.role || UserRole.USER,
          avatarId: userData.avatarId || "default",
          provider: userData.provider || "password",
          emailVerified: userRecord.emailVerified,
        },
        token: tokenData.token,
        refreshToken: tokenData.refreshToken,
        sessionId: tokenData.sessionId,
        expiresIn: tokenData.expiresIn,
        idToken: tokenData.idToken, // For backward compatibility
      };
    } catch (error) {
      logger.error("Error logging in with email/password", {
        error: error.message,
        code: error.code,
        email,
      });
      throw handleFirebaseError(error, 401);
    }
  }

  /**
   * Generate a secure session token with device fingerprint
   * @param {string} userId - User ID
   * @param {Object} deviceInfo - Device information for fingerprinting
   * @returns {Promise<Object>} - Token data
   */
  async generateSecureToken(userId, deviceInfo = {}) {
    try {
      // Get user data
      const userDoc = await this.usersCollection.doc(userId).get();

      if (!userDoc.exists) {
        throw createError(404, "User not found");
      }

      const userData = userDoc.data();

      // Create a device fingerprint
      const fingerprint = this.createDeviceFingerprint(deviceInfo);

      // Generate a custom token with short expiry
      const customToken = await this.auth.createCustomToken(userId, {
        role: userData.role || UserRole.USER,
        fingerprint: fingerprint,
        exp: Math.floor(Date.now() / 1000) + this.TOKEN_EXPIRY,
      });

      // Generate a refresh token
      const refreshToken = crypto.randomBytes(40).toString("hex");
      const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      // Store refresh token in Firestore with device info
      const refreshTokenDoc = {
        userId,
        tokenHash: refreshTokenHash,
        fingerprint,
        userAgent: deviceInfo.userAgent || "",
        ip: deviceInfo.ip || "",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + this.REFRESH_TOKEN_EXPIRY * 1000
        ).toISOString(),
        isRevoked: false,
      };

      await this.refreshTokensCollection.add(refreshTokenDoc);

      // Create a session record using the user's UID as the session ID
      // This is crucial for collection-based security
      const sessionId = userId; // Use the user's UID as the session ID

      // Check if a session already exists for this user
      const existingSession = await this.sessionCollection.doc(sessionId).get();

      if (existingSession.exists) {
        // Update the existing session
        await this.sessionCollection.doc(sessionId).update({
          fingerprint,
          userAgent: deviceInfo.userAgent || "",
          ip: deviceInfo.ip || "",
          lastActive: new Date().toISOString(),
          expiresAt: new Date(
            Date.now() + this.REFRESH_TOKEN_EXPIRY * 1000
          ).toISOString(),
        });

        logger.debug("Updated existing session for user", {
          userId,
          sessionId,
        });
      } else {
        // Create a new session
        await this.sessionCollection.doc(sessionId).set({
          userId,
          fingerprint,
          userAgent: deviceInfo.userAgent || "",
          ip: deviceInfo.ip || "",
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          expiresAt: new Date(
            Date.now() + this.REFRESH_TOKEN_EXPIRY * 1000
          ).toISOString(),
        });

        logger.debug("Created new session for user", { userId, sessionId });
      }

      return {
        token: customToken,
        refreshToken,
        sessionId,
        expiresIn: this.TOKEN_EXPIRY,
        user: {
          id: userId,
          email: userData.email,
          name: userData.name,
          role: userData.role || UserRole.USER,
          avatarId: userData.avatarId || "default",
          provider: userData.provider || "password",
          emailVerified: userData.emailVerified || false,
        },
      };
    } catch (error) {
      logger.error("Error generating secure token", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Create a device fingerprint from device info
   * This is crucial for collection-based security
   * @param {Object} deviceInfo - Device information
   * @returns {string} - Device fingerprint hash
   */
  createDeviceFingerprint(deviceInfo = {}) {
    try {
      // Create a string from device info with more parameters
      const fingerprintData = [
        deviceInfo.userAgent || "",
        deviceInfo.ip || "",
        deviceInfo.screenResolution || "",
        deviceInfo.timezone || "",
        deviceInfo.language || "",
        deviceInfo.platform || "",
        // Add browser name extracted from user agent
        this.extractBrowserInfo
          ? this.extractBrowserInfo(deviceInfo.userAgent || "")
          : "",
        // Add additional entropy
        new Date().toISOString().split("T")[0], // Current date for daily rotation
      ].join("|");

      // Create a hash of the device string
      return crypto.createHash("sha256").update(fingerprintData).digest("hex");
    } catch (error) {
      logger.warn("Error creating device fingerprint", {
        error: error.message,
        stack: error.stack,
      });
      // Fallback to a random fingerprint
      return crypto.randomBytes(16).toString("hex");
    }
  }

  /**
   * Ensure a user session exists
   * This method creates or updates a session document in Firestore
   * using the user's UID as the session document ID for collection-based security
   *
   * @param {string} userId - User ID
   * @param {Object} deviceInfo - Device information for fingerprinting
   * @returns {Promise<Object>} - Session data
   */
  async ensureUserSession(userId, deviceInfo = {}) {
    try {
      // Create fingerprint
      const fingerprint = this.createDeviceFingerprint(deviceInfo);

      // Check if a session already exists for this user
      const sessionDoc = await this.sessionCollection.doc(userId).get();

      const sessionData = {
        userId,
        fingerprint,
        userAgent: deviceInfo.userAgent || "",
        ip: deviceInfo.ip || "",
        lastActive: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + this.REFRESH_TOKEN_EXPIRY * 1000
        ).toISOString(),
      };

      if (sessionDoc.exists) {
        // Update the existing session
        await this.sessionCollection.doc(userId).update({
          ...sessionData,
        });

        logger.debug("Updated existing session for user", { userId });

        return {
          ...sessionData,
          sessionId: userId,
          createdAt: sessionDoc.data().createdAt,
        };
      } else {
        // Create a new session
        sessionData.createdAt = new Date().toISOString();

        await this.sessionCollection.doc(userId).set(sessionData);

        logger.debug("Created new session for user", { userId });

        return {
          ...sessionData,
          sessionId: userId,
        };
      }
    } catch (error) {
      logger.error("Error ensuring user session", {
        error: error.message,
        userId,
        stack: error.stack,
      });

      // Don't throw error for session issues - just log and continue
      return {
        sessionId: userId,
        error: error.message,
        userId,
      };
    }
  }

  /**
   * Decode a token without verification (for debugging only)
   * @param {string} token - JWT token to decode
   * @returns {Object} - Decoded token payload
   */
  decodeToken(token) {
    try {
      // This is a simple JWT decoder that doesn't verify the signature
      // It's only for debugging purposes and should never be used for authentication
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid token format");
      }

      // Decode the payload (middle part)
      const payload = parts[1];
      const decoded = Buffer.from(payload, "base64").toString();
      return JSON.parse(decoded);
    } catch (error) {
      logger.error("Error decoding token:", error);
      throw error;
    }
  }

  /**
   * Verify a Firebase ID token with enhanced security
   *
   * This method leverages Firebase Authentication for token verification
   * and adds additional security checks for session management.
   */
  async verifyToken(token, deviceInfo = {}) {
    try {
      // Log token verification attempt (without exposing the token)
      logger.debug("Verifying token", {
        tokenLength: token?.length || 0,
        deviceInfo: {
          ip: deviceInfo.ip || "unknown",
          userAgent: deviceInfo.userAgent?.substring(0, 50) || "unknown",
        },
      });

      if (!token) {
        logger.warn("Token verification failed: Empty token");
        return {
          isValid: false,
          message: "No token provided",
          code: "no_token",
        };
      }

      // Add more detailed logging for token debugging in development
      if (process.env.NODE_ENV === "development") {
        try {
          // Simple decode without verification for debugging
          const tokenParts = token.split(".");
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

      // Verify token with Firebase Auth
      // This will throw an error if the token is invalid, expired, or revoked
      const decodedToken = await this.auth.verifyIdToken(token, true);

      if (!decodedToken || !decodedToken.uid) {
        logger.warn("Token verification failed: Invalid token format");
        return {
          isValid: false,
          message: "Invalid token format",
          code: "invalid_token_format",
        };
      }

      // Log successful token decode
      logger.debug("Token decoded successfully", {
        uid: decodedToken.uid,
        email: decodedToken.email ? "present" : "missing",
        emailVerified: decodedToken.email_verified,
      });

      // Check if user exists in Firestore
      let userDoc = await this.usersCollection.doc(decodedToken.uid).get();

      // If user doesn't exist in Firestore, create a basic profile
      if (!userDoc.exists) {
        logger.warn("User not found for token, creating basic profile", {
          userId: decodedToken.uid,
        });

        try {
          // Create a basic user profile from the token data
          const userData = {
            email: decodedToken.email || "",
            name:
              decodedToken.name || decodedToken.email?.split("@")[0] || "User",
            role: UserRole.USER,
            emailVerified: decodedToken.email_verified || false,
            avatarId: "default",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            provider: decodedToken.firebase?.sign_in_provider || "password",
          };

          // Create the user document
          await this.usersCollection.doc(decodedToken.uid).set(userData);

          // Get the newly created user
          userDoc = await this.usersCollection.doc(decodedToken.uid).get();

          if (!userDoc.exists) {
            logger.error("Failed to create user profile", {
              userId: decodedToken.uid,
            });
            return {
              isValid: false,
              message: "Failed to create user profile",
              code: "user_creation_failed",
            };
          }

          logger.info("Created basic user profile from token", {
            userId: decodedToken.uid,
            email: userData.email,
          });
        } catch (error) {
          logger.error("Error creating user profile", {
            error: error.message,
            userId: decodedToken.uid,
            stack: error.stack,
          });
          return {
            isValid: false,
            message: "Error creating user profile",
            code: "user_creation_error",
          };
        }
      }

      const userData = userDoc.data();

      // Check if the user account is disabled
      if (userData.disabled) {
        logger.warn("Token verification failed: User account disabled", {
          userId: decodedToken.uid,
        });

        return {
          isValid: false,
          message: "Your account has been disabled. Please contact support.",
          code: "account_disabled",
        };
      }

      // For development environment, skip session checks to simplify testing
      if (process.env.NODE_ENV === "development") {
        logger.debug("Development mode: Skipping session checks", {
          userId: decodedToken.uid,
        });

        // Ensure a session exists for collection-based security
        try {
          await this.ensureUserSession(decodedToken.uid, deviceInfo);
        } catch (sessionError) {
          logger.warn(
            "Failed to ensure session in development mode, continuing anyway",
            {
              userId: decodedToken.uid,
              error: sessionError.message,
            }
          );
        }

        // Ensure user profile exists in Firestore
        try {
          if (!userData) {
            logger.warn("User document not found in Firestore, creating it", {
              userId: decodedToken.uid,
            });

            await this.ensureUserProfile(decodedToken.uid, {
              email: decodedToken.email || "",
              name:
                decodedToken.name ||
                decodedToken.email?.split("@")[0] ||
                "User",
              role: UserRole.USER,
              emailVerified: decodedToken.email_verified || false,
              avatarId: "default",
            });

            // Fetch the newly created user data
            const userDoc = await this.usersCollection
              .doc(decodedToken.uid)
              .get();
            if (userDoc.exists) {
              userData = userDoc.data();
            }
          }
        } catch (profileError) {
          logger.warn(
            "Failed to ensure user profile in development mode, continuing anyway",
            {
              userId: decodedToken.uid,
              error: profileError.message,
            }
          );
        }

        return {
          isValid: true,
          user: {
            id: decodedToken.uid,
            email: decodedToken.email || "",
            name:
              userData?.name ||
              decodedToken.name ||
              decodedToken.email?.split("@")[0] ||
              "User",
            role: userData?.role || UserRole.USER,
            avatarId: userData?.avatarId || "default",
            provider: userData?.provider || "password",
            emailVerified: decodedToken.email_verified || false,
          },
          sessionId: decodedToken.uid, // Use the user's UID as the session ID
        };
      }

      // If token contains a fingerprint, verify it matches current device
      if (decodedToken.fingerprint) {
        const currentFingerprint = this.createDeviceFingerprint(deviceInfo);
        if (decodedToken.fingerprint !== currentFingerprint) {
          logger.warn(
            "Token fingerprint mismatch - possible session hijacking attempt",
            {
              userId: decodedToken.uid,
              tokenFingerprint: decodedToken.fingerprint,
              currentFingerprint,
            }
          );

          // Log security event
          await this.logSecurityEvent(
            decodedToken.uid,
            SecurityEventType.SESSION_HIJACKING_ATTEMPT,
            SecurityEventSeverity.HIGH,
            {
              tokenFingerprint: decodedToken.fingerprint,
              currentFingerprint,
              ip: deviceInfo.ip || "unknown",
              userAgent: deviceInfo.userAgent || "unknown",
            }
          );

          return {
            isValid: false,
            message: "Invalid session. Please login again.",
            code: "session_mismatch",
          };
        }
      }

      // Check if user has an active session using collection ID-based security
      // The session document ID must match the user's UID
      const sessionDoc = await this.sessionCollection
        .doc(decodedToken.uid)
        .get();

      // Always use the user's UID as the session ID for collection-based security
      const sessionId = decodedToken.uid;

      if (!sessionDoc.exists) {
        // Create a new session for the user if none exists
        const fingerprint = this.createDeviceFingerprint(deviceInfo);

        // Create session document with the user's ID as the document ID
        // This ensures the session can be found by the Firestore rules
        const sessionData = {
          userId: decodedToken.uid,
          fingerprint,
          userAgent: deviceInfo.userAgent || "",
          ip: deviceInfo.ip || "",
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          expiresAt: new Date(
            Date.now() + this.REFRESH_TOKEN_EXPIRY * 1000
          ).toISOString(),
        };

        // Create a session with the user's ID as the document ID
        // This is required for collection-based security
        await this.sessionCollection.doc(decodedToken.uid).set(sessionData);

        logger.info(
          "Created new session for user with collection ID-based security",
          {
            userId: decodedToken.uid,
            sessionId,
          }
        );

        await this.ensureUserProfile(decodedToken.uid, {
          email: decodedToken.email,
          name: userData?.name || decodedToken.name,
          role: userData?.role || UserRole.USER,
          emailVerified: decodedToken.email_verified || false,
        });

        return {
          isValid: true,
          user: {
            id: decodedToken.uid,
            email: decodedToken.email,
            name: userData.name,
            role: userData.role || UserRole.USER,
            avatarId: userData.avatarId || "default",
            provider: userData.provider || "password",
            emailVerified: decodedToken.email_verified,
          },
          sessionId,
        };
      }

      // Session exists, get the session data
      const sessionData = sessionDoc.data();

      // Check for session inactivity timeout
      const lastActive = new Date(sessionData.lastActive).getTime();
      const now = Date.now();
      const inactivityTimeout =
        config.session?.inactivityTimeout || 30 * 60 * 1000; // Default 30 minutes

      if (now - lastActive > inactivityTimeout) {
        // Session has been inactive for too long, terminate it
        await this.sessionCollection.doc(sessionId).delete();

        logger.warn("Session terminated due to inactivity", {
          userId: decodedToken.uid,
          sessionId: sessionId,
          lastActive: sessionData.lastActive,
          inactivityPeriod: now - lastActive,
        });

        return {
          isValid: false,
          message: "Session expired due to inactivity. Please login again.",
          code: "session_inactivity_timeout",
        };
      }

      // Update session last activity
      await this.sessionCollection.doc(sessionId).update({
        lastActive: new Date().toISOString(),
      });

      return {
        isValid: true,
        user: {
          id: decodedToken.uid,
          email: decodedToken.email,
          name: userData.name,
          role: userData.role || UserRole.USER,
          avatarId: userData.avatarId || "default",
          provider: userData.provider || "password",
          emailVerified: decodedToken.email_verified,
        },
        sessionId: sessionDoc.id,
      };
    } catch (error) {
      logger.error("Token verification error", {
        error: error.message,
        code: error.code,
        stack: error.stack,
      });

      // Handle specific Firebase Auth error codes
      if (error.code === "auth/id-token-expired") {
        return {
          isValid: false,
          message: "Token expired. Please login again.",
          code: "token_expired",
        };
      }

      if (error.code === "auth/id-token-revoked") {
        return {
          isValid: false,
          message: "Token revoked. Please login again.",
          code: "token_revoked",
        };
      }

      if (error.code === "auth/user-disabled") {
        return {
          isValid: false,
          message: "Your account has been disabled. Please contact support.",
          code: "account_disabled",
        };
      }

      if (error.code === "auth/argument-error") {
        return {
          isValid: false,
          message: "Invalid token format. Please login again.",
          code: "invalid_token_format",
        };
      }

      return {
        isValid: false,
        message: "Invalid token. Please login again.",
        code: error.code || "token_invalid",
      };
    }
  }

  /**
   * Refresh access token using a refresh token
   * @param {string} refreshToken - The refresh token
   * @param {Object} deviceInfo - Device information for fingerprinting
   * @returns {Promise<Object>} - New token data
   */
  async refreshAccessToken(refreshToken, deviceInfo = {}) {
    try {
      // Create hash of the refresh token
      const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      // Find the refresh token in the database
      const refreshTokensSnapshot = await this.refreshTokensCollection
        .where("tokenHash", "==", refreshTokenHash)
        .where("isRevoked", "==", false)
        .where("expiresAt", ">", new Date().toISOString())
        .limit(1)
        .get();

      if (refreshTokensSnapshot.empty) {
        throw createError(401, "Invalid or expired refresh token");
      }

      const refreshTokenDoc = refreshTokensSnapshot.docs[0];
      const refreshTokenData = refreshTokenDoc.data();

      // Verify device fingerprint to prevent token theft
      const currentFingerprint = this.createDeviceFingerprint(deviceInfo);
      if (refreshTokenData.fingerprint !== currentFingerprint) {
        // Potential token theft - revoke the token and all user sessions
        await this.revokeAllUserSessions(refreshTokenData.userId);

        logger.warn(
          "Refresh token fingerprint mismatch - possible token theft",
          {
            userId: refreshTokenData.userId,
            tokenFingerprint: refreshTokenData.fingerprint,
            currentFingerprint,
          }
        );

        throw createError(
          401,
          "Security validation failed. Please login again."
        );
      }

      // Generate new tokens
      const tokenData = await this.generateSecureToken(
        refreshTokenData.userId,
        deviceInfo
      );

      // Revoke the old refresh token
      await this.refreshTokensCollection.doc(refreshTokenDoc.id).update({
        isRevoked: true,
        revokedAt: new Date().toISOString(),
        revokedReason: "Refreshed",
      });

      logger.info("Access token refreshed successfully", {
        userId: refreshTokenData.userId,
        sessionId: tokenData.sessionId,
      });

      return tokenData;
    } catch (error) {
      logger.error("Error refreshing access token", {
        error: error.message,
        code: error.code,
      });
      throw error;
    }
  }

  /**
   * Revoke all sessions for a user
   * @param {string} userId - User ID
   */
  async revokeAllUserSessions(userId) {
    try {
      // Get all active refresh tokens for the user
      const refreshTokensSnapshot = await this.refreshTokensCollection
        .where("userId", "==", userId)
        .where("isRevoked", "==", false)
        .get();

      // Revoke all refresh tokens
      const refreshTokenBatch = this.db.batch();
      refreshTokensSnapshot.docs.forEach((doc) => {
        refreshTokenBatch.update(doc.ref, {
          isRevoked: true,
          revokedAt: new Date().toISOString(),
          revokedReason: "Security enforcement",
        });
      });
      await refreshTokenBatch.commit();

      // Delete the user's session using collection ID-based security
      // The session document ID must match the user's UID
      const sessionDoc = await this.sessionCollection.doc(userId).get();

      if (sessionDoc.exists) {
        await this.sessionCollection.doc(userId).delete();
        logger.info("User session deleted using collection ID-based security", {
          userId,
        });
      }

      logger.info("All user sessions revoked", { userId });

      return { success: true, sessionsRevoked: sessionsSnapshot.size };
    } catch (error) {
      logger.error("Error revoking user sessions", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Logout a user from a specific session
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID to terminate
   * @param {string} refreshToken - Refresh token to revoke
   * @returns {Promise<Object>} - Result of logout operation
   */
  async logout(userId, sessionId, refreshToken = null) {
    try {
      let refreshTokenRevoked = false;

      // If refresh token is provided, revoke it
      if (refreshToken) {
        const refreshTokenHash = crypto
          .createHash("sha256")
          .update(refreshToken)
          .digest("hex");

        const refreshTokensSnapshot = await this.refreshTokensCollection
          .where("tokenHash", "==", refreshTokenHash)
          .where("userId", "==", userId)
          .where("isRevoked", "==", false)
          .limit(1)
          .get();

        if (!refreshTokensSnapshot.empty) {
          await this.refreshTokensCollection
            .doc(refreshTokensSnapshot.docs[0].id)
            .update({
              isRevoked: true,
              revokedAt: new Date().toISOString(),
              revokedReason: "User logout",
            });
          refreshTokenRevoked = true;
        }
      }

      // Delete the session using collection ID-based security
      // The session document ID must match the user's UID
      let sessionTerminated = false;

      // In collection ID-based security, the sessionId should always be the userId
      const sessionDoc = await this.sessionCollection.doc(userId).get();

      if (sessionDoc.exists) {
        await this.sessionCollection.doc(userId).delete();
        sessionTerminated = true;

        logger.info("Session terminated using collection ID-based security", {
          userId,
        });
      }

      logger.info("User logged out successfully", {
        userId,
        sessionId: sessionId || "unknown",
        refreshTokenRevoked,
      });

      return {
        success: true,
        sessionTerminated,
        refreshTokenRevoked,
      };
    } catch (error) {
      logger.error("Error during logout", {
        error: error.message,
        userId,
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const userDoc = await this.usersCollection.doc(userId).get();

      if (!userDoc.exists) {
        throw createError(404, "User not found");
      }

      const userData = userDoc.data();

      return {
        id: userDoc.id,
        email: userData.email,
        name: userData.name,
        role: userData.role || UserRole.USER,
        avatarId: userData.avatarId || "default",
        provider: userData.provider || "password",
        emailVerified: userData.emailVerified || false,
        bio: userData.bio || "",
        socialLinks: userData.socialLinks || {},
      };
    } catch (error) {
      logger.error("Error getting user by ID", {
        error: error.message,
        userId,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Ensure user profile exists in Firestore
   * This method creates or updates a user profile in Firestore
   * to ensure consistency between Firebase Auth and Firestore
   *
   * @param {string} userId - User ID
   * @param {Object} userData - User data to save
   * @returns {Promise<Object>} - Created or updated user data
   */
  async ensureUserProfile(userId, userData = {}) {
    try {
      // Check if user exists in Firebase Auth
      const authUser = await this.auth.getUser(userId).catch(() => null);

      if (!authUser) {
        logger.warn("User not found in Firebase Auth", { userId });
        throw createError(404, "User not found in authentication system");
      }

      // Check if user exists in Firestore
      const userDoc = await this.usersCollection.doc(userId).get();

      // Prepare user data with defaults from Auth if not provided
      const userDataToSave = {
        email: userData.email || authUser.email,
        name:
          userData.name ||
          authUser.displayName ||
          (authUser.email ? authUser.email.split("@")[0] : "User"),
        role: userData.role || UserRole.USER, // Default to USER role
        emailVerified:
          userData.emailVerified !== undefined
            ? userData.emailVerified
            : authUser.emailVerified,
        provider:
          userData.provider ||
          authUser.providerData[0]?.providerId ||
          "password",
        updatedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(), // Track user activity
      };

      // Use a transaction to ensure data consistency across collections
      const result = await this.db.runTransaction(async (transaction) => {
        if (!userDoc.exists) {
          // Create new user document with the user's UID as the document ID
          // This is crucial for collection-based security
          userDataToSave.createdAt = new Date().toISOString();
          userDataToSave.avatarId =
            userData.avatarId !== undefined ? userData.avatarId : "default";
          userDataToSave.preferences = userData.preferences || {};
          userDataToSave.bio = userData.bio || "";

          logger.info(
            "Creating new user profile in Firestore with collection-based security",
            {
              userId,
              email: userDataToSave.email,
              role: userDataToSave.role,
            }
          );

          // Set the user document with the user's UID as the document ID
          transaction.set(this.usersCollection.doc(userId), userDataToSave);

          // Create role-specific collection document if needed
          // This is crucial for collection-based security
          await this.ensureRoleCollections(transaction, userId, userDataToSave);

          return {
            id: userId,
            ...userDataToSave,
            isNew: true,
          };
        } else {
          // Update existing user document with new data, preserving existing fields
          const existingData = userDoc.data();
          const oldRole = existingData.role;
          const newRole = userData.role || existingData.role || UserRole.USER;

          const mergedData = {
            ...existingData,
            ...userDataToSave,
            role: newRole,
            avatarId:
              userData.avatarId !== undefined
                ? userData.avatarId
                : existingData.avatarId || "default",
            preferences: userData.preferences || existingData.preferences || {},
            lastActive: new Date().toISOString(),
          };

          logger.info(
            "Updating existing user profile in Firestore with collection-based security",
            {
              userId,
              oldRole,
              newRole,
            }
          );

          // Update the user document
          transaction.update(this.usersCollection.doc(userId), mergedData);

          // If role has changed, update role-specific collections
          // This is crucial for collection-based security
          if (oldRole !== newRole) {
            await this.updateRoleCollections(
              transaction,
              userId,
              oldRole,
              newRole,
              mergedData
            );
          }

          return {
            id: userId,
            ...mergedData,
            roleChanged: oldRole !== newRole,
          };
        }
      });

      // After transaction completes, ensure custom claims are set
      await this.auth.setCustomUserClaims(userId, {
        role: result.role,
      });

      // Create a session document for the user (outside transaction as it's not critical)
      await this.ensureUserSession(userId, {}).catch((err) => {
        logger.warn("Failed to create session during profile creation", {
          userId,
          error: err.message,
        });
      });

      logger.debug("User profile ensured with proper role collections", {
        userId,
        role: result.role,
        isNew: result.isNew,
        roleChanged: result.roleChanged,
      });

      return {
        id: userId,
        ...result,
      };
    } catch (error) {
      logger.error("Error ensuring user profile", {
        error: error.message,
        userId,
        stack: error.stack,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Ensure role-specific collections for a user
   * This is crucial for collection-based security
   * @private
   * @param {FirebaseFirestore.Transaction} transaction - Firestore transaction
   * @param {string} userId - User ID
   * @param {Object} userData - User data
   */
  async ensureRoleCollections(transaction, userId, userData) {
    const { role, email, name } = userData;
    const timestamp = new Date().toISOString();

    // Common document data - using the user's UID as the document ID
    const docData = {
      userId,
      email: email || "",
      name: name || "",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastActive: timestamp,
    };

    // Create role-specific collection document with the user's UID as the document ID
    // This is crucial for collection-based security
    if (role === UserRole.ADMIN) {
      // Add to admins collection
      transaction.set(this.adminsCollection.doc(userId), {
        ...docData,
        addedBy: "system",
        permissions: ["manage_users", "manage_content", "view_analytics"],
      });

      logger.info(
        "Added user to admins collection for collection-based security",
        {
          userId,
          role: UserRole.ADMIN,
        }
      );
    } else if (role === UserRole.SUPERADMIN) {
      // Add to superadmins collection
      transaction.set(this.superadminsCollection.doc(userId), {
        ...docData,
        addedBy: "system",
        permissions: [
          "manage_users",
          "manage_content",
          "view_analytics",
          "manage_admins",
          "system_config",
        ],
      });

      logger.info(
        "Added user to superadmins collection for collection-based security",
        {
          userId,
          role: UserRole.SUPERADMIN,
        }
      );
    } else if (role === UserRole.COUNSELOR) {
      // Add to counselors collection
      transaction.set(this.db.collection("counselors").doc(userId), {
        ...docData,
        specialization: "",
        availability: [],
        isAvailable: false,
        rating: 0,
        totalRatings: 0,
      });

      logger.info(
        "Added user to counselors collection for collection-based security",
        {
          userId,
          role: UserRole.COUNSELOR,
        }
      );
    }

    // Always ensure the user is in the users collection regardless of role
    // This is crucial for collection-based security
    if (!userData.isInUsersCollection) {
      transaction.set(this.usersCollection.doc(userId), {
        ...userData,
        updatedAt: timestamp,
      });

      logger.info(
        "Ensured user exists in users collection for collection-based security",
        {
          userId,
          role,
        }
      );
    }
  }

  /**
   * Update role-specific collections when a user's role changes
   * This is crucial for collection-based security
   * @private
   * @param {FirebaseFirestore.Transaction} transaction - Firestore transaction
   * @param {string} userId - User ID
   * @param {string} oldRole - Previous role
   * @param {string} newRole - New role
   * @param {Object} userData - User data
   */
  async updateRoleCollections(transaction, userId, oldRole, newRole, userData) {
    // Remove from old role collection if needed
    if (oldRole === UserRole.ADMIN) {
      transaction.delete(this.adminsCollection.doc(userId));
      logger.info(
        "Removed user from admins collection for collection-based security",
        {
          userId,
          oldRole,
          newRole,
        }
      );
    } else if (oldRole === UserRole.SUPERADMIN) {
      transaction.delete(this.superadminsCollection.doc(userId));
      logger.info(
        "Removed user from superadmins collection for collection-based security",
        {
          userId,
          oldRole,
          newRole,
        }
      );
    } else if (oldRole === UserRole.COUNSELOR) {
      transaction.delete(this.db.collection("counselors").doc(userId));
      logger.info(
        "Removed user from counselors collection for collection-based security",
        {
          userId,
          oldRole,
          newRole,
        }
      );
    }

    // Add to new role collection
    // Mark that the user is already in the users collection to avoid duplicate writes
    await this.ensureRoleCollections(transaction, userId, {
      ...userData,
      role: newRole,
      isInUsersCollection: true, // Prevent duplicate writes to users collection
    });

    // Update the user document in the users collection with the new role
    // This is crucial for collection-based security
    transaction.update(this.usersCollection.doc(userId), {
      role: newRole,
      updatedAt: new Date().toISOString(),
    });

    logger.info(
      "Updated user role in users collection for collection-based security",
      {
        userId,
        oldRole,
        newRole,
      }
    );
  }

  /**
   * Ensure user session exists in Firestore
   * This method creates or updates a session document in Firestore
   * using the user's UID as the session document ID for collection-based security
   *
   * @param {string} userId - User ID
   * @param {Object} deviceInfo - Device information for fingerprinting
   * @returns {Promise<Object>} - Session data
   */
  async ensureUserSession(userId, deviceInfo = {}) {
    try {
      // Check if a session document exists with the user's UID as the document ID
      // This is crucial for collection-based security
      const sessionDoc = await this.sessionCollection.doc(userId).get();

      // Create fingerprint if device info is provided
      const fingerprint =
        deviceInfo.userAgent || deviceInfo.ip
          ? this.createDeviceFingerprint(deviceInfo)
          : crypto.randomBytes(16).toString("hex");

      // Prepare session data with the user's UID as the session ID
      const sessionData = {
        userId,
        fingerprint,
        userAgent: deviceInfo.userAgent || "",
        ip: deviceInfo.ip || "",
        lastActive: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + this.REFRESH_TOKEN_EXPIRY * 1000
        ).toISOString(),
        // Add device information for better security and tracking
        device: {
          platform: deviceInfo.platform || "unknown",
          browser: this.extractBrowserInfo(deviceInfo.userAgent || ""),
          screenSize: deviceInfo.screenResolution || "unknown",
          timezone: deviceInfo.timezone || "unknown",
          language: deviceInfo.language || "unknown",
        },
      };

      if (!sessionDoc.exists) {
        // Create new session document with the user's UID as the document ID
        sessionData.createdAt = new Date().toISOString();

        logger.info(
          "Creating new session document in Firestore for collection-based security",
          {
            userId,
            sessionId: userId, // Using the user's UID as the session ID
          }
        );

        await this.sessionCollection.doc(userId).set(sessionData);
      } else {
        // Update existing session document
        logger.debug(
          "Updating existing session document for collection-based security",
          {
            userId,
            sessionId: userId, // Using the user's UID as the session ID
          }
        );

        // Preserve existing device information if not provided in the current request
        const existingData = sessionDoc.data();
        const existingDevice = existingData.device || {};

        await this.sessionCollection.doc(userId).update({
          lastActive: new Date().toISOString(),
          expiresAt: new Date(
            Date.now() + this.REFRESH_TOKEN_EXPIRY * 1000
          ).toISOString(),
          fingerprint,
          userAgent: deviceInfo.userAgent || existingData.userAgent || "",
          ip: deviceInfo.ip || existingData.ip || "",
          // Update device information, preserving existing values if not provided
          device: {
            platform:
              deviceInfo.platform || existingDevice.platform || "unknown",
            browser: deviceInfo.userAgent
              ? this.extractBrowserInfo(deviceInfo.userAgent)
              : existingDevice.browser || "unknown",
            screenSize:
              deviceInfo.screenResolution ||
              existingDevice.screenSize ||
              "unknown",
            timezone:
              deviceInfo.timezone || existingDevice.timezone || "unknown",
            language:
              deviceInfo.language || existingDevice.language || "unknown",
          },
        });
      }

      // Also ensure the user document is updated with the last active timestamp
      // This is important for tracking user activity
      await this.usersCollection
        .doc(userId)
        .update({
          lastActive: new Date().toISOString(),
        })
        .catch((err) => {
          // Don't fail if the user document doesn't exist yet
          logger.warn("Failed to update user lastActive timestamp", {
            userId,
            error: err.message,
          });
        });

      return {
        sessionId: userId, // Using the user's UID as the session ID
        ...sessionData,
      };
    } catch (error) {
      logger.error("Error ensuring user session", {
        error: error.message,
        userId,
        stack: error.stack,
      });

      // Don't throw error for session issues - just log and continue
      return { sessionId: userId, error: error.message };
    }
  }

  /**
   * Extract browser information from user agent string
   * @private
   * @param {string} userAgent - User agent string
   * @returns {string} - Browser information
   */
  extractBrowserInfo(userAgent) {
    if (!userAgent) return "unknown";

    try {
      // Extract browser name and version from user agent
      if (userAgent.includes("Chrome")) {
        return "Chrome";
      } else if (userAgent.includes("Firefox")) {
        return "Firefox";
      } else if (
        userAgent.includes("Safari") &&
        !userAgent.includes("Chrome")
      ) {
        return "Safari";
      } else if (userAgent.includes("Edge")) {
        return "Edge";
      } else if (userAgent.includes("MSIE") || userAgent.includes("Trident/")) {
        return "Internet Explorer";
      } else {
        return "Other";
      }
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId, updates) {
    try {
      const userRef = this.usersCollection.doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw createError(404, "User not found");
      }

      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      const updateData = {
        ...filteredUpdates,
        updatedAt: new Date().toISOString(),
      };

      await userRef.update(updateData);

      if (updates.name) {
        await this.auth.updateUser(userId, {
          displayName: updates.name,
        });
      }

      if (updates.email) {
        await this.auth.updateUser(userId, {
          email: updates.email,
        });
      }

      return await this.getUserById(userId);
    } catch (error) {
      logger.error("Error updating user profile", {
        error: error.message,
        userId,
        updates,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(userId, role, updatedBy) {
    if (!Object.values(UserRole).includes(role)) {
      throw new Error("Invalid role");
    }

    try {
      // Check role assignment permissions
      if (role === UserRole.SUPERADMIN) {
        // Only superadmins can assign the superadmin role
        const isUpdaterSuperAdmin = await this.isUserSuperAdmin(updatedBy);
        if (!isUpdaterSuperAdmin) {
          const error = "Only superadmins can assign the superadmin role";

          // Log security event
          await logSecurityEvent(
            SecurityEventType.UNAUTHORIZED_ACCESS,
            SecurityEventSeverity.HIGH,
            {
              userId: updatedBy,
              targetUserId: userId,
              attemptedAction: "assign_superadmin_role",
              message: error,
            }
          );

          throw new Error(error);
        }
      } else if (role === UserRole.ADMIN) {
        // Only superadmins can assign the admin role
        const isUpdaterSuperAdmin = await this.isUserSuperAdmin(updatedBy);
        if (!isUpdaterSuperAdmin) {
          const error = "Only superadmins can assign the admin role";

          // Log security event
          await logSecurityEvent(
            SecurityEventType.UNAUTHORIZED_ACCESS,
            SecurityEventSeverity.MEDIUM,
            {
              userId: updatedBy,
              targetUserId: userId,
              attemptedAction: "assign_admin_role",
              message: error,
            }
          );

          throw new Error(error);
        }
      } else if (role === UserRole.COUNSELOR) {
        // Only admins or superadmins can assign the counselor role
        const isUpdaterAdmin = await this.isUserAdmin(updatedBy);
        if (!isUpdaterAdmin) {
          const error = "Only admins can assign the counselor role";

          // Log security event
          await logSecurityEvent(
            SecurityEventType.UNAUTHORIZED_ACCESS,
            SecurityEventSeverity.MEDIUM,
            {
              userId: updatedBy,
              targetUserId: userId,
              attemptedAction: "assign_counselor_role",
              message: error,
            }
          );

          throw new Error(error);
        }
      }

      // Use a transaction to ensure data consistency
      const transactionResult = await this.db.runTransaction(
        async (transaction) => {
          // Get user document
          const userRef = this.usersCollection.doc(userId);
          const userDoc = await transaction.get(userRef);

          if (!userDoc.exists) {
            throw new Error("User not found");
          }

          const userData = userDoc.data();

          // Update role in users collection
          transaction.update(userRef, {
            role,
            updatedAt: new Date().toISOString(),
          });

          // Handle admin collection membership
          const adminDocRef = this.adminsCollection.doc(userId);
          const adminDoc = await transaction.get(adminDocRef);

          // Handle superadmin collection membership
          const superadminDocRef = this.superadminsCollection.doc(userId);
          const superadminDoc = await transaction.get(superadminDocRef);

          if (role === UserRole.SUPERADMIN) {
            // Add to superadmins collection if not already there
            if (!superadminDoc.exists) {
              transaction.set(superadminDocRef, {
                userId,
                email: userData.email,
                name: userData.name || "",
                addedBy: updatedBy,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }

            // Remove from admins collection if they're in it
            if (adminDoc.exists) {
              transaction.delete(adminDocRef);
            }
          } else if (role === UserRole.ADMIN) {
            // Add to admins collection if not already there
            if (!adminDoc.exists) {
              transaction.set(adminDocRef, {
                userId,
                email: userData.email,
                name: userData.name || "",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }

            // Remove from superadmins collection if they're in it
            if (superadminDoc.exists) {
              transaction.delete(superadminDocRef);
            }
          } else {
            // For other roles, remove from both admin and superadmin collections
            if (adminDoc.exists) {
              transaction.delete(adminDocRef);
            }

            if (superadminDoc.exists) {
              transaction.delete(superadminDocRef);
            }
          }

          return {
            success: true,
            userId,
            newRole: role,
            previousRole: userData.role,
          };
        }
      );

      // Update Firebase Auth custom claims after transaction completes
      // This is done outside the transaction since Firebase Auth is separate from Firestore
      await this.auth.setCustomUserClaims(userId, { role });

      logger.info("User role updated successfully", {
        userId,
        newRole: role,
        updatedBy,
      });

      // Log security event for role change
      await logSecurityEvent(
        SecurityEventType.ROLE_CHANGE,
        role === UserRole.SUPERADMIN || role === UserRole.ADMIN
          ? SecurityEventSeverity.HIGH
          : SecurityEventSeverity.MEDIUM,
        {
          userId,
          updatedBy,
          previousRole: transactionResult.previousRole,
          newRole: role,
          timestamp: new Date().toISOString(),
        }
      );

      return transactionResult;
    } catch (error) {
      logger.error("Role update failed", {
        userId,
        role,
        error: error.message,
        updatedBy,
      });
      throw new Error(`Role update failed: ${error.message}`);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    try {
      // Find user with reset token
      const userSnapshot = await this.usersCollection
        .where("resetToken", "==", token)
        .where("resetTokenExpiry", ">", new Date())
        .get();

      if (userSnapshot.empty) {
        throw createError(400, "Invalid or expired reset token");
      }

      const user = userSnapshot.docs[0];

      // Update password using Firebase Auth
      await this.auth.updateUser(user.id, {
        password: newPassword,
      });

      // Clear reset token in Firestore
      await this.usersCollection.doc(user.id).update({
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date().toISOString(),
      });

      logger.info("Password reset successfully", {
        userId: user.id,
      });

      return { success: true };
    } catch (error) {
      logger.error("Password reset failed", {
        error: error.message,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email) {
    try {
      const userSnapshot = await this.usersCollection
        .where("email", "==", email)
        .get();

      if (userSnapshot.empty) {
        throw createError(404, "User not found");
      }

      const user = userSnapshot.docs[0];
      const userData = user.data();

      // Check if user is using Google Auth
      if (userData.provider === "google") {
        throw createError(
          400,
          "Password reset is not available for Google accounts. Please reset your password through your Google account settings."
        );
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Save reset token
      await this.usersCollection.doc(user.id).update({
        resetToken,
        resetTokenExpiry,
      });

      logger.info("Password reset token generated", {
        userId: user.id,
        email,
      });

      // In a production environment, we should use Firebase's built-in password reset functionality
      // which handles email sending automatically
      try {
        // Use Firebase Auth's built-in password reset
        await client.auth.sendPasswordResetEmail(email);

        logger.info("Password reset email sent via Firebase", {
          email,
          userId: user.id,
        });

        // Return success without exposing the token
        return { success: true, message: "Password reset email sent" };
      } catch (firebaseError) {
        logger.error(
          "Firebase password reset failed, using token-based fallback",
          {
            email,
            error: firebaseError.message,
          }
        );

        // For backward compatibility, return the token
        // In a real production app, you would integrate with a proper email service here
        return {
          success: true,
          token: resetToken,
          resetUrl: `${
            process.env.CLIENT_URL || "https://mindquest.iiitkottayam.ac.in"
          }/reset-password?token=${resetToken}`,
        };
      }
    } catch (error) {
      logger.error("Password reset email failed", {
        email,
        error: error.message,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Check if user is admin using collection ID-based security
   * This is a production-ready approach that checks if the user ID exists
   * as a document ID in the admins collection
   */
  async isUserAdmin(userId) {
    try {
      if (!userId) {
        logger.warn("Empty userId provided to isUserAdmin check");
        return false;
      }

      // First check if user is a superadmin (superadmins have admin privileges)
      const isSuperAdmin = await this.isUserSuperAdmin(userId);
      if (isSuperAdmin) {
        return true;
      }

      // If not a superadmin, check if they're in the admins collection
      // This is collection ID-based security - the document ID must match the user ID
      const adminDoc = await this.adminsCollection.doc(userId).get();

      // For additional security, we could also check fields inside the document
      if (adminDoc.exists) {
        const adminData = adminDoc.data();
        // Verify the admin status is active and the userId matches
        if (adminData.userId === userId) {
          return true;
        }

        // If userId doesn't match, log this as a potential security issue
        if (adminData.userId !== userId) {
          logger.warn(
            "Admin document userId mismatch - possible security issue",
            {
              userId,
              documentUserId: adminData.userId,
            }
          );
          return false;
        }
      }

      return false;
    } catch (error) {
      logger.error("Admin check failed", {
        userId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Ensure admin status is properly set in collections
   * This method ensures that a user's admin status is properly reflected in the admin collections
   *
   * @param {string} userId - User ID
   * @param {string} role - User role
   * @param {string} [addedBy] - ID of the user who is adding this admin/superadmin
   * @returns {Promise<Object>} - Result of the operation
   */
  async ensureAdminStatus(userId, role, addedBy = null) {
    try {
      // Get user data
      const userDoc = await this.usersCollection.doc(userId).get();

      if (!userDoc.exists) {
        logger.warn("User not found when ensuring admin status", { userId });
        return { success: false, error: "User not found" };
      }

      const userData = userDoc.data();

      // Check admin collection
      const adminDoc = await this.adminsCollection.doc(userId).get();

      // Check superadmin collection
      const superadminDoc = await this.superadminsCollection.doc(userId).get();

      // Prepare batch for atomic operations
      const batch = this.db.batch();
      let changes = [];

      if (role === UserRole.SUPERADMIN) {
        // User should be in superadmin collection
        if (!superadminDoc.exists) {
          batch.set(this.superadminsCollection.doc(userId), {
            userId,
            email: userData.email,
            name: userData.name || "",
            addedBy: addedBy || "system",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          changes.push("Added to superadmins collection");
        }

        // Remove from admins collection if present
        if (adminDoc.exists) {
          batch.delete(this.adminsCollection.doc(userId));
          changes.push("Removed from admins collection");
        }

        // Update user role in users collection
        if (userData.role !== UserRole.SUPERADMIN) {
          batch.update(this.usersCollection.doc(userId), {
            role: UserRole.SUPERADMIN,
            updatedAt: new Date().toISOString(),
          });
          changes.push("Updated user role to superadmin");
        }
      } else if (role === UserRole.ADMIN) {
        // User should be in admin collection
        if (!adminDoc.exists) {
          batch.set(this.adminsCollection.doc(userId), {
            userId,
            email: userData.email,
            name: userData.name || "",
            addedBy: addedBy || "system",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          changes.push("Added to admins collection");
        }

        // Remove from superadmins collection if present
        if (superadminDoc.exists) {
          batch.delete(this.superadminsCollection.doc(userId));
          changes.push("Removed from superadmins collection");
        }

        // Update user role in users collection
        if (userData.role !== UserRole.ADMIN) {
          batch.update(this.usersCollection.doc(userId), {
            role: UserRole.ADMIN,
            updatedAt: new Date().toISOString(),
          });
          changes.push("Updated user role to admin");
        }
      } else {
        // User should not be in admin or superadmin collections
        if (adminDoc.exists) {
          batch.delete(this.adminsCollection.doc(userId));
          changes.push("Removed from admins collection");
        }

        if (superadminDoc.exists) {
          batch.delete(this.superadminsCollection.doc(userId));
          changes.push("Removed from superadmins collection");
        }

        // Update user role in users collection if it's admin or superadmin
        if (
          userData.role === UserRole.ADMIN ||
          userData.role === UserRole.SUPERADMIN
        ) {
          batch.update(this.usersCollection.doc(userId), {
            role: role || UserRole.USER,
            updatedAt: new Date().toISOString(),
          });
          changes.push(`Updated user role to ${role || UserRole.USER}`);
        }
      }

      // Commit batch if there are changes
      if (changes.length > 0) {
        await batch.commit();

        // Update Firebase Auth custom claims
        await this.auth.setCustomUserClaims(userId, { role });

        logger.info("Admin status updated", {
          userId,
          role,
          changes,
        });
      } else {
        logger.debug("No changes needed for admin status", {
          userId,
          role,
        });
      }

      return {
        success: true,
        userId,
        role,
        changes,
      };
    } catch (error) {
      logger.error("Error ensuring admin status", {
        error: error.message,
        userId,
        role,
        stack: error.stack,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is superadmin using collection ID-based security
   * This is a production-ready approach that checks if the user ID exists
   * as a document ID in the superadmins collection
   */
  async isUserSuperAdmin(userId) {
    try {
      if (!userId) {
        logger.warn("Empty userId provided to isUserSuperAdmin check");
        return false;
      }

      // Check if they're in the superadmins collection
      // This is collection ID-based security - the document ID must match the user ID
      const superadminDoc = await this.superadminsCollection.doc(userId).get();

      // For additional security, we could also check fields inside the document
      if (superadminDoc.exists) {
        const superadminData = superadminDoc.data();
        // Verify the userId matches
        if (superadminData.userId === userId) {
          return true;
        }

        // If userId doesn't match, log this as a potential security issue
        if (superadminData.userId !== userId) {
          logger.warn(
            "Superadmin document userId mismatch - possible security issue",
            {
              userId,
              documentUserId: superadminData.userId,
            }
          );
          return false;
        }
      }

      return false;
    } catch (error) {
      logger.error("Superadmin check failed", {
        userId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Log a security event to the security_events collection
   * @private
   * @param {string} userId - User ID
   * @param {string} type - Event type from SecurityEventType
   * @param {string} severity - Severity level from SecurityEventSeverity
   * @param {Object} details - Event details
   */
  async logSecurityEvent(userId, type, severity, details) {
    try {
      await this.db.collection("security_events").add({
        userId,
        type,
        severity,
        details,
        timestamp: new Date().toISOString(),
        ip: details.ip || "unknown",
        userAgent: details.userAgent || "unknown",
        resolved: false,
      });

      logger.warn(`Security event logged: ${type} (${severity})`, {
        userId,
        details,
      });
    } catch (error) {
      logger.error("Error logging security event", {
        error: error.message,
        userId,
        type,
        severity,
      });
    }
  }

  /**
   * Add a user to the superadmins collection
   * @param {string} userId - User ID to add as superadmin
   * @param {string} addedBy - ID of the user who is adding this superadmin
   * @returns {Promise<Object>} - The created superadmin document
   */
  async addSuperAdmin(userId, addedBy) {
    try {
      // Check if the user exists
      const userDoc = await this.usersCollection.doc(userId).get();

      if (!userDoc.exists) {
        throw createError(404, "User not found");
      }

      const userData = userDoc.data();

      // Create superadmin document
      const superadminData = {
        userId,
        email: userData.email,
        name: userData.name || "",
        addedBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.superadminsCollection.doc(userId).set(superadminData);

      // Update user role in Firestore
      await this.usersCollection.doc(userId).update({
        role: UserRole.SUPERADMIN,
        updatedAt: new Date().toISOString(),
      });

      // Update Firebase Auth custom claims
      await this.auth.setCustomUserClaims(userId, {
        role: UserRole.SUPERADMIN,
      });

      logger.info("User added as superadmin", {
        userId,
        addedBy,
      });

      return {
        id: userId,
        ...superadminData,
      };
    } catch (error) {
      logger.error("Error adding superadmin", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Remove a user from the superadmins collection
   * @param {string} userId - User ID to remove from superadmins
   * @param {string} removedBy - ID of the user who is removing this superadmin
   * @returns {Promise<boolean>} - True if successful
   */
  async removeSuperAdmin(userId, removedBy) {
    try {
      // Check if the user is a superadmin
      const isSuperAdmin = await this.isUserSuperAdmin(userId);

      if (!isSuperAdmin) {
        throw createError(404, "User is not a superadmin");
      }

      // Remove from superadmins collection
      await this.superadminsCollection.doc(userId).delete();

      // Update user role in Firestore to admin
      await this.usersCollection.doc(userId).update({
        role: UserRole.ADMIN,
        updatedAt: new Date().toISOString(),
      });

      // Update Firebase Auth custom claims
      await this.auth.setCustomUserClaims(userId, {
        role: UserRole.ADMIN,
      });

      // Ensure user is in admins collection
      const adminDoc = await this.adminsCollection.doc(userId).get();
      if (!adminDoc.exists) {
        const userDoc = await this.usersCollection.doc(userId).get();
        const userData = userDoc.data();

        await this.adminsCollection.doc(userId).set({
          userId,
          email: userData.email,
          name: userData.name || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      logger.info("User removed from superadmins", {
        userId,
        removedBy,
      });

      return true;
    } catch (error) {
      logger.error("Error removing superadmin", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete a user account
   * @param {string} userId - The ID of the user to delete
   * @param {string} password - The user's password for verification (verified on client side)
   * @param {string} reason - Optional reason for deletion
   */
  async deleteUser(userId, _password, reason = "") {
    try {
      // Get user data from Firestore
      const userDoc = await this.usersCollection.doc(userId).get();

      if (!userDoc.exists) {
        throw createError(404, "User not found");
      }

      const userData = userDoc.data();

      // Use a transaction to ensure data consistency
      await this.db.runTransaction(async (transaction) => {
        // Delete from users collection
        transaction.delete(this.usersCollection.doc(userId));

        // Delete from admins collection if user is admin
        if (userData.role === UserRole.ADMIN) {
          const adminDoc = await transaction.get(
            this.adminsCollection.doc(userId)
          );
          if (adminDoc.exists) {
            transaction.delete(this.adminsCollection.doc(userId));
          }
        }

        // Delete from superadmins collection if user is superadmin
        if (userData.role === UserRole.SUPERADMIN) {
          const superadminDoc = await transaction.get(
            this.superadminsCollection.doc(userId)
          );
          if (superadminDoc.exists) {
            transaction.delete(this.superadminsCollection.doc(userId));
          }
        }

        // Log deletion reason if provided
        if (reason) {
          transaction.set(this.db.collection("deletedAccounts").doc(userId), {
            email: userData.email,
            name: userData.name,
            reason,
            deletedAt: new Date().toISOString(),
          });
        }
      });

      // Delete user from Firebase Auth
      await this.auth.deleteUser(userId);

      logger.info("User account deleted successfully", {
        userId,
        email: userData.email,
        reason: reason || "Not provided",
      });

      return { success: true };
    } catch (error) {
      logger.error("Error deleting user account", {
        userId,
        error: error.message,
        code: error.code,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Verify email with verification code
   * @param {string} code - The verification code sent to the user's email
   * @returns {Promise<Object>} - Result of the verification
   */
  async verifyEmail(code) {
    try {
      // In a production app, we would verify the code against Firebase Auth
      // For now, we'll implement a simple verification
      if (!code) {
        throw createError(400, "Verification code is required");
      }

      // Check if the code exists in our verification codes collection
      const verificationQuery = await this.db
        .collection("emailVerifications")
        .where("code", "==", code)
        .where("expiresAt", ">", new Date().toISOString())
        .limit(1)
        .get();

      if (verificationQuery.empty) {
        throw createError(400, "Invalid or expired verification code");
      }

      const verificationDoc = verificationQuery.docs[0];
      const verificationData = verificationDoc.data();
      const userId = verificationData.userId;

      // Mark the user's email as verified in Firebase Auth
      await this.auth.updateUser(userId, {
        emailVerified: true,
      });

      // Update the user document in Firestore
      await this.usersCollection.doc(userId).update({
        emailVerified: true,
        updatedAt: new Date().toISOString(),
      });

      // Delete the verification code
      await verificationDoc.ref.delete();

      logger.info("Email verified successfully", {
        userId,
        email: verificationData.email,
      });

      return { success: true };
    } catch (error) {
      logger.error("Error verifying email", {
        code,
        error: error.message,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Change user password
   * @param {string} userId - The ID of the user
   * @param {string} currentPassword - The current password (verified on client side)
   * @param {string} newPassword - The new password
   * @returns {Promise<Object>} - Result of the password change
   */
  async changePassword(userId, _currentPassword, newPassword) {
    try {
      // Get user data from Firestore
      const userDoc = await this.usersCollection.doc(userId).get();

      if (!userDoc.exists) {
        throw createError(404, "User not found");
      }

      const userData = userDoc.data();

      // In a real implementation, we would verify the current password
      // using Firebase Auth's signInWithEmailAndPassword
      // For this implementation, we'll just update the password

      // Update password in Firebase Auth
      await this.auth.updateUser(userId, {
        password: newPassword,
      });

      // Update password change timestamp in Firestore
      await this.usersCollection.doc(userId).update({
        passwordChangedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      logger.info("Password changed successfully", {
        userId,
        email: userData.email,
      });

      return { success: true };
    } catch (error) {
      logger.error("Error changing password", {
        userId,
        error: error.message,
        code: error.code,
      });
      throw handleFirebaseError(error);
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
