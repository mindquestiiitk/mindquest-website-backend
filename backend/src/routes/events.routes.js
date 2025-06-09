/**
 * Events routes
 * Handles routes related to events
 */
import express from "express";
import { EventsController } from "../controllers/events.controller.js";
import {
  clientAuthMiddleware,
  clientIsAdmin,
} from "../middleware/client-auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import logger from "../utils/logger.js";

const router = express.Router();
const eventsController = new EventsController();

// Log all events route access
router.use((req, res, next) => {
  logger.info(`Events route accessed: ${req.method} ${req.path}`, {
    userId: req.user?.id,
    ip: req.ip,
  });
  next();
});

// Public routes with security protection
// Get all events (basic data only)
router.get("/", arcjetProtection, eventsController.getAllEvents);

// Get all events with complete details (roles + participants)
router.get("/complete", arcjetProtection, eventsController.getCompleteEvents);

// Get event by ID (basic data only)
router.get("/:id", arcjetProtection, eventsController.getEventById);

// Get event by ID with complete details (roles + participants)
router.get(
  "/:id/complete",
  arcjetProtection,
  eventsController.getCompleteEvent
);

// Legacy endpoints removed - use dedicated endpoints (/complete) instead

// Protected routes - none currently needed

export default router;
