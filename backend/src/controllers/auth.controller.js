import { AuthService } from "../services/auth.service.js";
import { validateRequest } from "../utils/validation.js";
import { createError } from "../utils/error.js";
import { auth } from "../config/firebase.config.js";

export class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  register = async (req, res, next) => {
    try {
      const { email, password, name, idToken } = req.body;

      // Check if registration is using Firebase token or direct credentials
      if (idToken) {
        // Firebase token-based registration
        validateRequest(req, {
          email: { type: "string", required: true },
          name: { type: "string", required: true },
          idToken: { type: "string", required: true },
        });

        // Verify the Firebase ID token
        const decodedToken = await auth.verifyIdToken(idToken);

        // Create user in your database
        const user = await this.authService.createUser({
          firebaseId: decodedToken.uid,
          email: email || decodedToken.email,
          name: name || decodedToken.name || decodedToken.email.split("@")[0],
        });

        // Generate JWT token
        const token = this.authService.generateToken(user);

        return res.status(201).json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
            token,
          },
        });
      } else {
        // Direct credentials registration
        validateRequest(req, {
          email: { type: "string", required: true },
          password: { type: "string", required: true, min: 6 },
          name: { type: "string", required: true },
        });

        const user = await this.authService.register({ email, password, name });

        // Set session if using sessions
        if (req.session) {
          req.session.userId = user.id;
        }

        res.status(201).json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
          },
        });
      }
    } catch (error) {
      next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Validate request
      validateRequest(req, {
        email: { type: "string", required: true },
        password: { type: "string", required: true },
      });

      const { user, token } = await this.authService.login(email, password);

      // Set session
      req.session.userId = user.id;

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req, res, next) => {
    try {
      // Clear session
      req.session.destroy();

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  getCurrentUser = async (req, res, next) => {
    try {
      const user = await this.authService.getUserById(req.user.id);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarId: user.avatarId || "default",
            provider: user.provider || "password",
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req, res, next) => {
    try {
      const { name, email, avatarId } = req.body;

      // Validate request
      validateRequest(req, {
        name: { type: "string", required: false },
        email: { type: "string", required: false },
        avatarId: { type: "string", required: false },
      });

      const user = await this.authService.updateUser(req.user.id, {
        name,
        email,
        avatarId,
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarId: user.avatarId,
            provider: user.provider || "password",
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req, res, next) => {
    try {
      const { email } = req.body;

      // Validate request
      validateRequest(req, {
        email: { type: "string", required: true },
      });

      await this.authService.sendPasswordResetEmail(email);

      res.json({
        success: true,
        message: "Password reset email sent",
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req, res, next) => {
    try {
      const { token, password } = req.body;

      // Validate request
      validateRequest(req, {
        token: { type: "string", required: true },
        password: { type: "string", required: true, min: 6 },
      });

      await this.authService.resetPassword(token, password);

      res.json({
        success: true,
        message: "Password reset successful",
      });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Validate request
      validateRequest(req, {
        currentPassword: { type: "string", required: true },
        newPassword: { type: "string", required: true, min: 6 },
      });

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
      next(error);
    }
  };

  validateToken = async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          error: "No token provided",
        });
      }

      const result = await this.authService.validateToken(token);

      res.status(200).json({
        success: true,
        data: result,
        message: "Token is valid",
      });
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(401).json({
        success: false,
        error: error.message || "Invalid token",
      });
    }
  };

  async updateUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      await this.authService.updateUserRole(userId, role);
      res.status(200).json({
        success: true,
        message: "User role updated successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  googleAuth = async (req, res) => {
    try {
      const { idToken } = req.body;
      const result = await this.authService.handleGoogleSignIn(idToken);
      res.json(result);
    } catch (error) {
      console.error("Google auth error:", error);
      res.status(401).json({ error: error.message });
    }
  };

  googleCallback = async (req, res) => {
    try {
      const { code } = req.query;
      const result = await this.authService.handleGoogleCallback(code);

      // Redirect to frontend with token
      res.redirect(
        `${process.env.FRONTEND_URL}/auth/callback?token=${result.token}`
      );
    } catch (error) {
      console.error("Google callback error:", error);
      res.redirect(
        `${process.env.FRONTEND_URL}/login?error=google_auth_failed`
      );
    }
  };

  handleGoogleSignIn = async (req, res) => {
    try {
      const { idToken } = req.body;
      const result = await this.authService.handleGoogleSignIn(idToken);

      res.status(200).json({
        success: true,
        data: result,
        message: "Google login successful",
      });
    } catch (error) {
      console.error("Google sign in error:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to sign in with Google",
      });
    }
  };

  registerGoogleUser = async (req, res) => {
    try {
      const userData = req.body;
      const result = await this.authService.registerGoogleUser(userData);
      res.json(result);
    } catch (error) {
      console.error("Google registration error:", error);
      res.status(400).json({ error: error.message });
    }
  };

  checkAuth = async (req, res) => {
    try {
      const result = await this.authService.checkAuthStatus(
        req.cookies.session
      );
      res.json(result);
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(401).json({ error: error.message });
    }
  };

  handleFirebaseToken = async (req, res, next) => {
    try {
      const { idToken } = req.body;

      // Validate request
      validateRequest(req, {
        idToken: { type: "string", required: true },
      });

      console.log("Verifying Firebase ID token...");
      // Verify the Firebase ID token
      const decodedToken = await auth.verifyIdToken(idToken);
      console.log("Firebase ID token verified for user:", decodedToken.uid);

      // Get or create user in your database
      let user = await this.authService.getUserByFirebaseId(decodedToken.uid);

      if (!user) {
        console.log("User not found, creating new user...");
        // Create new user if doesn't exist
        user = await this.authService.createUser({
          firebaseId: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name || decodedToken.email.split("@")[0],
          provider: "google", // Set provider for Google Auth users
        });
        console.log("New user created:", user.id);
      } else {
        console.log("Existing user found:", user.id);
      }

      // Generate your own JWT token
      const token = this.authService.generateToken(user);
      console.log("JWT token generated successfully");

      // Return token in both formats for compatibility
      res.json({
        success: true,
        token, // Direct token property for older clients
        data: {
          token, // Nested token property for newer clients
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarId: user.avatarId || "default",
            provider: user.provider || "password",
          },
        },
      });
    } catch (error) {
      console.error("Error handling Firebase token:", error);
      next(error);
    }
  };
}
