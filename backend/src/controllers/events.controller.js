/**
 * Events controller
 * Handles HTTP requests related to events
 */
import { EventsService } from "../services/events.service.js";
import { catchAsync } from "../utils/error.js";
import { successResponse, notFoundResponse } from "../utils/response.js";
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

    // In production, we don't auto-seed
    // Just return an empty array if no events are found
    if (!events || events.length === 0) {
      logger.info("No events found in the database");
      events = [];
    }

    // Use standardized response format
    successResponse(res, events, "Events retrieved successfully");
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
    // Use standardized response format
    successResponse(res, event, "Event retrieved successfully");
  });
}
