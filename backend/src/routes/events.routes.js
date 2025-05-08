import express from "express";
import { EventsController } from "../controllers/events.controller.js";

const router = express.Router();
const eventsController = new EventsController();

// Get all events
router.get("/", eventsController.getAllEvents.bind(eventsController));

// Get event by ID
router.get("/:id", eventsController.getEventById.bind(eventsController));

// Seed events (admin only)
router.post("/seed", eventsController.seedEvents.bind(eventsController));

export default router;
