/**
 * OAuth Controller
 * 
 * Handles OAuth authentication methods like Google Sign-In
 */

import { auth, db } from "../config/firebase.config.js";
import { catchAsync } from "../utils/error.js";
import logger from "../utils/logger.js";
import { authService, UserRole } from "../services/auth.service.js";

export class OAuthController {
  constructor() {
    this.auth = auth;
    this.db = db;
    this.usersCollection = db.collection("users");
    this.authService = authService;
  }

  /**
   * Handle Google OAuth sign-in/registration
   * Unlike email/password registration, OAuth providers manage their own authentication
   * and password validation should be skipped
   */
  handleGoogleSignIn = catchAsync(async (req, res, next) => {
    try {
      const { idToken, deviceInfo } = req.body;

      if (!idToken) {
        return res.status(400).json({
          success: false,
          error: {
            message: "ID token is required",
            code: "missing_token"
          }
        });
      }

      // Verify the token with Firebase
      const decodedToken = await this.auth.verifyIdToken(idToken);
      
      if (!decodedToken.uid) {
        return res.status(401).json({
          success: false,
          error: {
            message: "Invalid authentication token",
            code: "invalid_token",
          }
        });
      }

      // Check if user already exists in Firestore
      const userDoc = await this.usersCollection.doc(decodedToken.uid).get();
      
      // User data for new or existing user
      const userData = {
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split('@')[0],
        provider: 'google',
        emailVerified: decodedToken.email_verified || false,
        avatarId: decodedToken.picture || 'default',
        updatedAt: new Date().toISOString()
      };

      if (!userDoc.exists) {
        // Create new user
        userData.role = UserRole.USER;
        userData.createdAt = new Date().toISOString();
        
        await this.usersCollection.doc(decodedToken.uid).set(userData);
        
        logger.info("New user created via Google OAuth", {
          userId: decodedToken.uid,
          email: userData.email
        });
      } else {
        // Update existing user
        await this.usersCollection.doc(decodedToken.uid).update({
          ...userData,
          role: userDoc.data().role // Preserve existing role
        });
        
        logger.info("Existing user logged in via Google OAuth", {
          userId: decodedToken.uid,
          email: userData.email
        });
      }

      // Generate token and create session
      const authToken = await this.authService.generateSecureToken(
        decodedToken.uid,
        userData,
        deviceInfo || {}
      );

      res.status(200).json({
        success: true,
        data: authToken
      });
    } catch (error) {
      logger.error("Google OAuth error", {
        error: error.message,
        code: error.code
      });
      next(error);
    }
  });
}

export const oAuthController = new OAuthController();
