/**
 * Admin routes
 * Handles routes related to admin operations
 */
import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import {
  authMiddleware,
  authorize,
  authorizeAdmin,
} from "../middleware/auth.middleware.js";
import { UserRole } from "../services/auth.service.js";
import logger from "../utils/logger.js";

const router = Router();
const adminController = new AdminController();

// Log all admin route access
router.use((req, res, next) => {
  logger.info(`Admin route accessed: ${req.method} ${req.path}`, {
    userId: req.user?.id,
    ip: req.ip,
  });
  next();
});

// All admin routes require authentication
router.use(authMiddleware);

// Stats routes
router.get("/stats", authorizeAdmin, adminController.getSystemStats);

// User count route
router.get("/users/count", authorizeAdmin, adminController.getUserCount);

// Counselor count route
router.get(
  "/counselors/count",
  authorizeAdmin,
  adminController.getCounselorCount
);

// Message count route
router.get("/messages/count", authorizeAdmin, adminController.getMessageCount);

export default router;
