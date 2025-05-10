import { auth, db } from "../config/firebase.config.js";
import { createError } from "../utils/error.js";
import {
  handleFirebaseError,
  createErrorResponse,
} from "../utils/firebase-error-handler.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export const UserRole = {
  USER: "user",
  COUNSELOR: "counselor",
  ADMIN: "admin",
};

export class AuthService {
  constructor() {
    this.auth = auth;
    this.db = db;
    this.usersCollection = db.collection("users");
  }

  async registerUser(email, password, role = UserRole.USER) {
    try {
      console.log("Starting user registration...");

      // Create user in Firebase Auth
      console.log("Creating user in Firebase Auth...");
      const userRecord = await this.auth.createUser({
        email,
        password,
      });
      console.log("User created in Auth:", userRecord.uid);

      // Set custom claims for role
      console.log("Setting custom claims...");
      await this.auth.setCustomUserClaims(userRecord.uid, { role });
      console.log("Custom claims set successfully");

      // Create user document in Firestore
      console.log("Creating Firestore document...");
      const userRef = this.db.collection("users").doc(userRecord.uid);
      const userData = {
        email,
        role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log("User data to be saved:", userData);

      await userRef.set(userData);
      console.log("Firestore document created successfully");

      // Create custom token
      console.log("Creating custom token...");
      const token = await this.auth.createCustomToken(userRecord.uid);
      console.log("Token created successfully");

      return {
        success: true,
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          role,
          token,
        },
      };
    } catch (error) {
      console.error("Error registering user:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });

      // If user creation in Auth succeeded but Firestore failed, clean up
      if (error.code === 5 && userRecord?.uid) {
        try {
          console.log("Cleaning up Auth user after Firestore failure...");
          await this.auth.deleteUser(userRecord.uid);
          console.log("Auth user cleaned up successfully");
        } catch (deleteError) {
          console.error(
            "Error cleaning up user after failed registration:",
            deleteError
          );
        }
      }

      // Handle Firebase errors with user-friendly messages
      throw handleFirebaseError(error);
    }
  }

  async loginUser(email, password) {
    try {
      // Get user by email
      const userRecord = await this.auth.getUserByEmail(email);

      // Get user data from Firestore
      const userRef = this.db.collection("users").doc(userRecord.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        // If user exists in Auth but not in Firestore, return needsRegistration flag
        return {
          success: false,
          needsRegistration: true,
          userData: {
            email: userRecord.email,
            uid: userRecord.uid,
          },
        };
      }

      const userData = userDoc.data();

      // Create custom token
      const token = await this.auth.createCustomToken(userRecord.uid);

      return {
        success: true,
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          role: userData.role,
          token,
        },
      };
    } catch (error) {
      if (error.code === 5) {
        return {
          success: false,
          needsRegistration: true,
          message: "User profile not found. Please complete registration.",
        };
      }
      console.error("Error logging in user:", error);

      // Handle Firebase errors with user-friendly messages
      throw handleFirebaseError(error, 401);
    }
  }

  async validateToken(token) {
    try {
      if (!token) {
        return { success: false, message: "No token provided" };
      }

      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace("Bearer ", "");

      // Verify the token
      const decodedToken = await this.auth.verifyIdToken(cleanToken);

      // Get user data from Firestore
      const userDoc = await this.db
        .collection("users")
        .doc(decodedToken.uid)
        .get();

      if (!userDoc.exists) {
        return {
          success: false,
          needsRegistration: true,
          userData: {
            email: decodedToken.email,
            uid: decodedToken.uid,
          },
        };
      }

      const userData = userDoc.data();
      return {
        success: true,
        data: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          role: userData.role,
        },
      };
    } catch (error) {
      console.error("Error validating token:", error);

      if (error.code === "auth/argument-error") {
        return {
          success: false,
          message: "Invalid token format. Please sign in again.",
        };
      }

      if (error.code === "auth/id-token-expired") {
        return {
          success: false,
          message: "Token has expired. Please sign in again.",
        };
      }

      if (error.code === "auth/invalid-id-token") {
        return {
          success: false,
          message: "Invalid token. Please sign in again.",
        };
      }

      return {
        success: false,
        message: "Failed to validate token",
      };
    }
  }

  async updateUserRole(userId, role) {
    if (!Object.values(UserRole).includes(role)) {
      throw new Error("Invalid role");
    }

    try {
      await this.db.collection("users").doc(userId).update({
        role,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Role update failed: ${error.message}`);
    }
  }

  // Google Authentication Methods
  async createGoogleAuthToken() {
    try {
      // Create a custom token that will be used to sign in with Google
      const token = await this.auth.createCustomToken("google-auth");
      return token;
    } catch (error) {
      console.error("Error creating Google auth token:", error);
      throw new Error("Failed to initialize Google authentication");
    }
  }

  async getGoogleAuthURL() {
    try {
      const auth = auth;
      const provider = new GoogleAuthProvider();
      const authUrl = await auth.signInWithPopup(provider);
      return authUrl;
    } catch (error) {
      console.error("Error getting Google auth URL:", error);
      throw new Error("Failed to initialize Google authentication");
    }
  }

  async handleGoogleSignIn(idToken) {
    try {
      // Verify the Google ID token
      const decodedToken = await this.auth.verifyIdToken(idToken);

      // Check if user exists in Firestore
      const userQuery = await this.db
        .collection("users")
        .where("email", "==", decodedToken.email)
        .limit(1)
        .get();

      if (userQuery.empty) {
        // User doesn't exist, return data for registration
        return {
          success: false,
          needsRegistration: true,
          userData: {
            email: decodedToken.email,
            name: decodedToken.name,
            picture: decodedToken.picture,
          },
        };
      }

      // User exists, get their data
      const userDoc = userQuery.docs[0];
      const userData = userDoc.data();
      return {
        success: true,
        data: {
          uid: userDoc.id,
          email: decodedToken.email,
          name: userData.name,
          picture: userData.picture,
          role: userData.role,
        },
      };
    } catch (error) {
      console.error("Error handling Google sign in:", error);
      if (error.code === 5) {
        return {
          success: false,
          needsRegistration: true,
          userData: {
            email: decodedToken?.email,
            name: decodedToken?.name,
            picture: decodedToken?.picture,
          },
        };
      }
      throw new Error("Invalid Google token");
    }
  }

  async registerGoogleUser(userData) {
    try {
      // Create user in Firebase Auth
      const userRecord = await this.auth.createUser({
        email: userData.email,
        displayName: userData.name,
        photoURL: userData.picture,
        emailVerified: true,
      });

      // Set custom claims for role
      await this.auth.setCustomUserClaims(userRecord.uid, {
        role: userData.role || UserRole.USER,
      });

      // Create user document in Firestore
      const userRef = this.db.collection("users").doc(userRecord.uid);
      await userRef.set({
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        role: userData.role || UserRole.USER,
        username: userData.username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        provider: "google",
      });

      // Create custom token
      const token = await this.auth.createCustomToken(userRecord.uid);

      return {
        success: true,
        data: {
          uid: userRecord.uid,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          role: userData.role || UserRole.USER,
          username: userData.username,
          token,
        },
      };
    } catch (error) {
      console.error("Error registering Google user:", error);
      // If user creation in Auth succeeded but Firestore failed, clean up
      if (error.code === 5 && userRecord?.uid) {
        try {
          await this.auth.deleteUser(userRecord.uid);
        } catch (deleteError) {
          console.error(
            "Error cleaning up user after failed registration:",
            deleteError
          );
        }
      }
      throw new Error("Failed to register user");
    }
  }

  async logoutUser(sessionCookie) {
    try {
      if (sessionCookie) {
        await this.auth.verifySessionCookie(sessionCookie);
        await this.auth.revokeRefreshTokens(sessionCookie);
      }
      return { success: true };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async checkAuthStatus(sessionCookie) {
    try {
      if (!sessionCookie) {
        return { isAuthenticated: false };
      }

      const decodedClaims = await this.auth.verifySessionCookie(sessionCookie);
      const userRef = this.db.collection("users").doc(decodedClaims.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return { isAuthenticated: false };
      }

      const userData = userDoc.data();
      return {
        isAuthenticated: true,
        user: {
          uid: decodedClaims.uid,
          email: decodedClaims.email,
          role: userData.role,
          name: userData.name,
          picture: userData.picture,
        },
      };
    } catch (error) {
      return { isAuthenticated: false };
    }
  }

  async register({ email, password, name, avatarId = "default" }) {
    try {
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

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const userRef = this.usersCollection.doc();
      const user = {
        id: userRef.id,
        email,
        name,
        password: hashedPassword,
        role: "user",
        avatarId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await userRef.set(user);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      // If it's already a handled error (AppError), throw it directly
      if (error.isOperational) {
        throw error;
      }

      // Otherwise, handle Firebase errors with user-friendly messages
      throw handleFirebaseError(error);
    }
  }

  async login(email, password) {
    try {
      // Find user
      const userSnapshot = await this.usersCollection
        .where("email", "==", email)
        .get();
      if (userSnapshot.empty) {
        throw createError(
          401,
          "No account found with this email address. Please check your email or register."
        );
      }

      const userDoc = userSnapshot.docs[0];
      const user = { id: userDoc.id, ...userDoc.data() };

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw createError(
          401,
          "Incorrect password. Please try again or reset your password."
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      // Ensure avatarId exists
      if (!userWithoutPassword.avatarId) {
        userWithoutPassword.avatarId = "default";
      }

      return { user: userWithoutPassword, token };
    } catch (error) {
      // If it's already a handled error (AppError), throw it directly
      if (error.isOperational) {
        throw error;
      }

      // Otherwise, handle Firebase errors with user-friendly messages
      throw handleFirebaseError(error, 401);
    }
  }

  async getUserById(userId) {
    try {
      const userDoc = await this.usersCollection.doc(userId).get();
      if (!userDoc.exists) {
        throw createError(404, "User not found");
      }

      const user = { id: userDoc.id, ...userDoc.data() };
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  async updateUser(userId, updates) {
    try {
      const userRef = this.usersCollection.doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw createError(404, "User not found");
      }

      // If email is being updated, check if it's already taken
      if (updates.email) {
        const existingUser = await this.usersCollection
          .where("email", "==", updates.email)
          .get();

        if (!existingUser.empty && existingUser.docs[0].id !== userId) {
          throw createError(400, "Email already in use");
        }
      }

      // Filter out undefined values to prevent Firestore errors
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      // Update user
      const updateData = {
        ...filteredUpdates,
        updatedAt: new Date().toISOString(),
      };

      await userRef.update(updateData);

      // Get updated user
      const updatedUser = await this.getUserById(userId);
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email) {
    try {
      const userSnapshot = await this.usersCollection
        .where("email", "==", email)
        .get();
      if (userSnapshot.empty) {
        throw createError(404, "User not found");
      }

      const user = userSnapshot.docs[0];

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Save reset token
      await this.usersCollection.doc(user.id).update({
        resetToken,
        resetTokenExpiry,
      });

      // TODO: Send email with reset token
      // For now, just return the token
      return resetToken;
    } catch (error) {
      throw error;
    }
  }

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

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password and clear reset token
      await this.usersCollection.doc(user.id).update({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  }

  async getUserByFirebaseId(firebaseId) {
    try {
      const userDoc = await this.usersCollection.doc(firebaseId).get();
      if (!userDoc.exists) {
        return null;
      }
      return {
        id: userDoc.id,
        ...userDoc.data(),
      };
    } catch (error) {
      console.error("Error getting user by Firebase ID:", error);
      throw error;
    }
  }

  async createUser({ firebaseId, email, name, avatarId = "default" }) {
    try {
      const userData = {
        email,
        name,
        role: UserRole.USER,
        avatarId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.usersCollection.doc(firebaseId).set(userData);

      return {
        id: firebaseId,
        ...userData,
      };
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );
  }
}
