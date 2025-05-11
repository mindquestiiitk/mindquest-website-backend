import express from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authMiddleware, authorize } from "../middleware/auth.middleware.js";
import { UserRole } from "../services/auth.service.js";
import {
  arcjetProtection,
  emailDomainValidation,
} from "../middleware/arcjet.middleware.js";
import { auth } from "../config/firebase.config.js";

const router = express.Router();
const authController = new AuthController();

// router.use(arcjet.shield()); // General security
// router.use(arcjet.detectBot()); // Bot detection
// router.use(arcjet.slidingWindow({ limit: 100, windowMs: 60000 }));

// Public routes
router.post(
  "/register",
  arcjetProtection,
  emailDomainValidation,
  authController.register
);
router.post(
  "/login",
  arcjetProtection,
  emailDomainValidation,
  authController.login
);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/token", arcjetProtection, authController.handleFirebaseToken);

// Protected routes
router.get("/me", authMiddleware, authController.getCurrentUser);
router.put("/me", authMiddleware, authController.updateProfile);
router.post("/logout", authMiddleware, authController.logout);
router.post("/change-password", authMiddleware, authController.changePassword);

router.post("/validate", arcjetProtection, authController.validateToken);

router.put(
  "/role/:userId",
  arcjetProtection,
  authMiddleware,
  authorize([UserRole.ADMIN]),
  authController.updateUserRole.bind(authController)
);

// Google Authentication Routes
router.post("/google", arcjetProtection, authController.handleGoogleSignIn);
router.post(
  "/google/register",
  arcjetProtection,
  authController.registerGoogleUser
);

// Session Management Routes
router.get("/check", arcjetProtection, authController.checkAuth);

export default router;
