/**
 * Events controller
 * Handles HTTP requests related to events
 */
import { EventsService } from "../services/events.service.js";
import { catchAsync } from "../utils/error.js";
import { successResponse, notFoundResponse } from "../utils/response.js";
import { compatResponse } from "../utils/compatibility.js";
import logger from "../utils/logger.js";

export class EventsController {
  constructor() {
    this.eventsService = new EventsService();
  }

  /**
   * Get all events
   * @route GET /events
   */
  getAllEvents = catchAsync(async (req, res) => {
    logger.info("Fetching all events", { path: req.path, method: req.method });

    let events = await this.eventsService.getAllEvents();
    logger.debug(`Found ${events?.length || 0} events`);

    // Auto-seed if no events found
    if (!events || events.length === 0) {
      logger.info("No events found, attempting to seed...");
      await this.eventsService.seedEvents();
      events = await this.eventsService.getAllEvents();
      logger.info(`After seeding, found ${events.length} events`);
    }

    // Use compatibility utility to handle both formats
    compatResponse(req, res, events, "Events retrieved successfully");
  });

  /**
   * Get event by ID
   * @route GET /events/:id
   */
  getEventById = catchAsync(async (req, res) => {
    const { id } = req.params;
    logger.info(`Fetching event by ID: ${id}`, {
      path: req.path,
      method: req.method,
    });

    const event = await this.eventsService.getEventById(id);

    if (!event) {
      logger.warn(`Event not found: ${id}`);
      return notFoundResponse(res, "Event not found");
    }

    logger.debug(`Event found: ${id}`);
    // Use compatibility utility to handle both formats
    compatResponse(req, res, event, "Event retrieved successfully");
  });

  /**
   * Seed events database
   * @route POST /events/seed
   */
  seedEvents = catchAsync(async (req, res) => {
    logger.info("Starting events seeding process", {
      path: req.path,
      method: req.method,
    });

    await this.eventsService.seedEvents();
    const events = await this.eventsService.getAllEvents();

    logger.info(`Seeding complete, ${events.length} events available`);
    successResponse(
      res,
      { count: events.length },
      "Events seeded successfully"
    );
  });
}
