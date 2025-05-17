/**
 * Admin routes
 * Handles routes related to admin operations
 */
import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { AdminEventsController } from "../controllers/admin-events.controller.js";
import {
  clientAuthMiddleware,
  clientAuthorize,
  clientIsAdmin,
} from "../middleware/client-auth.middleware.js";
import { UserRole } from "../services/auth.service.js";
import logger from "../utils/logger.js";

const router = Router();
const adminController = new AdminController();
const adminEventsController = new AdminEventsController();

// Log all admin route access
router.use((req, res, next) => {
  logger.info(`Admin route accessed: ${req.method} ${req.path}`, {
    userId: req.user?.id,
    ip: req.ip,
  });
  next();
});

// All admin routes require authentication
router.use(clientAuthMiddleware);

// Stats routes
router.get("/stats", clientIsAdmin, adminController.getSystemStats);

// User count route
router.get("/users/count", clientIsAdmin, adminController.getUserCount);

// Counselor count route
router.get(
  "/counselors/count",
  clientIsAdmin,
  adminController.getCounselorCount
);

// Message count route
router.get("/messages/count", clientIsAdmin, adminController.getMessageCount);

// Event role management routes
router.post("/events/roles", clientIsAdmin, adminEventsController.assignRole);
router.get(
  "/events/roles/user/:userId",
  clientIsAdmin,
  adminEventsController.getUserRoles
);
router.get(
  "/events/roles/event/:eventId",
  clientIsAdmin,
  adminEventsController.getEventRoles
);
router.post(
  "/events/roles/process-expired",
  clientIsAdmin,
  adminEventsController.processExpiredRoles
);
router.get(
  "/events/roles/legacy",
  clientIsAdmin,
  adminEventsController.getLegacyRoles
);

// Event management with roles
router.post("/events", clientIsAdmin, adminEventsController.createEvent);
router.put(
  "/events/:eventId",
  clientIsAdmin,
  adminEventsController.updateEvent
);

export default router;
