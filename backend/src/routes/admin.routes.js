/**
 * Admin routes
 * Handles routes related to admin operations
 */
import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { AdminEventsController } from "../controllers/admin-events.controller.js";

import {
  clientAuthMiddleware,
  clientIsAdmin,
} from "../middleware/client-auth.middleware.js";
import { db } from "../config/firebase.config.js";
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
router.get("/events/search", clientIsAdmin, adminEventsController.searchEvents);

// Security analytics endpoint - Firebase-powered
router.get("/security/analytics", clientIsAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    // Get real security analytics from Firebase collections
    const { getSecurityAnalytics } = await import(
      "../middleware/arcjet-analytics.middleware.js"
    );
    const analytics = await getSecurityAnalytics(days);

    // Log analytics access to Firebase Analytics
    if (req.user?.id) {
      try {
        // Track admin analytics access for monitoring
        await db.collection("admin_activity").add({
          userId: req.user.id,
          action: "security_analytics_viewed",
          timestamp: new Date(),
          metadata: {
            daysRequested: days,
            ip: req.ip,
            userAgent: req.headers["user-agent"]?.substring(0, 100),
          },
        });
      } catch (logError) {
        logger.warn("Failed to log analytics access", {
          error: logError.message,
        });
      }
    }

    res.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString(),
      source: "firebase_firestore",
    });
  } catch (error) {
    logger.error("Failed to get security analytics", { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to retrieve security analytics",
        code: "analytics_error",
      },
    });
  }
});

export default router;
