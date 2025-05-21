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

// Public routes
// Get all events
router.get("/", eventsController.getAllEvents);

// Get event by ID
router.get("/:id", eventsController.getEventById);

// Protected routes
// Seed events (admin only)
router.post(
  "/seed",
  clientAuthMiddleware,
  clientIsAdmin,
  eventsController.seedEvents
);

export default router;
