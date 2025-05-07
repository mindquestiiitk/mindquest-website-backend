import { AuthService } from "../services/auth.service.js";

export class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  register = async (req, res) => {
    try {
      const { email, password, role } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: "Email and password are required",
        });
      }

      const result = await this.authService.registerUser(email, password, role);

      res.status(201).json({
        success: true,
        data: result,
        message: "User registered successfully",
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to register user",
      });
    }
  };

  login = async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: "Email and password are required",
        });
      }

      const result = await this.authService.loginUser(email, password);

      res.status(200).json({
        success: true,
        data: result,
        message: "Login successful",
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to login",
      });
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

  logout = async (req, res) => {
    try {
      await this.authService.logoutUser(req.cookies.session);
      res.clearCookie("session");
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: error.message });
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
}
