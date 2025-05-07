import express from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { UserRole } from "../services/auth.service.js";
import {
  arcjetProtection,
  emailDomainValidation,
} from "../middleware/arcjet.middleware.js";
import { auth } from "../config/firebase.config.js";

const router = express.Router();
const authController = new AuthController();

router.post(
  "/register",
  emailDomainValidation,
  arcjetProtection,
  authController.register
);

router.post("/login", arcjetProtection, authController.login);

router.post("/validate", arcjetProtection, authController.validateToken);

router.put(
  "/role/:userId",
  arcjetProtection,
  authenticate,
  authorize([UserRole.ADMIN]),
  authController.updateUserRole.bind(authController)
);

// Google Authentication Routes
router.post("/google", authController.handleGoogleSignIn);
router.post("/google/register", authController.registerGoogleUser);

// Session Management Routes
router.post("/logout", authController.logout);
router.get("/check", authController.checkAuth);

export default router;
