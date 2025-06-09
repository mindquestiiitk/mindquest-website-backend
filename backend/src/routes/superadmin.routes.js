/**
 * Superadmin routes
 * Handles routes related to superadmin operations
 */
import { Router } from "express";
import { superadminController } from "../controllers/superadmin.controller.js";
import {
  clientAuthMiddleware,
  clientIsSuperAdmin,
} from "../middleware/client-auth.middleware.js";
import logger from "../utils/logger.js";

const router = Router();

// Log all superadmin route access
router.use((req, res, next) => {
  logger.info(`Superadmin route accessed: ${req.method} ${req.path}`, {
    userId: req.user?.id,
    ip: req.ip,
  });
  next();
});

// All superadmin routes require authentication and superadmin privileges
router.use(clientAuthMiddleware);
router.use(clientIsSuperAdmin);

// Superadmin management routes
router.post("/add", superadminController.addSuperAdmin);
router.post("/remove", superadminController.removeSuperAdmin);
router.get("/list", superadminController.listSuperAdmins);
router.get("/check/:userId", superadminController.checkSuperAdmin);

// ==========================================
// TESTING FEATURE: User Management System
// ==========================================
// These routes provide comprehensive user management for superadmins
// Can be easily removed by deleting these routes

// User management routes
router.get("/users", superadminController.getAllUsers);
router.get("/admins", superadminController.getAllAdmins);
router.post("/promote-admin", superadminController.promoteToAdmin);
router.post("/demote-admin", superadminController.demoteAdmin);
router.put("/user-permissions", superadminController.updateUserPermissions);
router.delete("/user/:userId", superadminController.deleteUser);

export default router;
