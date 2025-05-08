import jwt from "jsonwebtoken";
import { createError } from "../utils/error.js";
import { AuthService } from "../services/auth.service.js";

const authService = new AuthService();

export const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authentication Error",
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Get user
    const user = await authService.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Authentication Error",
        message: "User not found",
      });
    }

    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Authentication Error",
        message: "Invalid token",
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Authentication Error",
        message: "Token expired",
      });
    } else {
      return res.status(500).json({
        success: false,
        error: "Server Error",
        message: "Internal server error",
      });
    }
  }
};

export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication Error",
        message: "Not authenticated",
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Authorization Error",
        message: "Not authorized",
      });
    }

    next();
  };
};
