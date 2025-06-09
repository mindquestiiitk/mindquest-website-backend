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
   * Get all events with complete details (roles + participants)
   * @route GET /events/complete
   */
  getCompleteEvents = catchAsync(async (req, res) => {
    logger.info("Fetching complete events with all details", {
      path: req.path,
      method: req.method,
    });

    let events = await this.eventsService.getEventsWithDetails([
      "roles",
      "participants",
    ]);

    logger.debug("Complete events retrieved", {
      eventCount: events?.length || 0,
    });

    // In production, we don't auto-seed
    if (!events || events.length === 0) {
      logger.info("No events found in the database");
      events = [];
    }

    successResponse(res, events, "Complete events retrieved successfully");
  });

  /**
   * Get single event with complete details (roles + participants)
   * @route GET /events/:id/complete
   */
  getCompleteEvent = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Security: Validate event ID parameter
    if (!id || typeof id !== "string" || id.length > 50) {
      return res.status(400).json({
        success: false,
        error: "Invalid event ID parameter",
        code: "invalid_event_id",
      });
    }

    logger.info(`Fetching complete event by ID: ${id}`, {
      path: req.path,
      method: req.method,
    });

    const event = await this.eventsService.getEventWithDetails(id, [
      "roles",
      "participants",
    ]);

    if (!event) {
      logger.warn(`Event not found: ${id}`);
      return notFoundResponse(res, "Event not found");
    }

    logger.debug(`Complete event found: ${id}`);
    successResponse(res, event, "Complete event retrieved successfully");
  });

  /**
   * Get basic events (without roles/participants)
   * @route GET /events
   */
  getAllEvents = catchAsync(async (req, res) => {
    logger.info("Fetching basic events", {
      path: req.path,
      method: req.method,
    });

    let events = await this.eventsService.getAllEvents();
    logger.debug(`Found ${events?.length || 0} events`);

    if (!events || events.length === 0) {
      logger.info("No events found in the database");
      events = [];
    }

    successResponse(res, events, "Events retrieved successfully");
  });

  /**
   * Get event by ID (basic data only)
   * @route GET /events/:id
   */
  getEventById = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Security: Validate event ID parameter
    if (!id || typeof id !== "string" || id.length > 50) {
      return res.status(400).json({
        success: false,
        error: "Invalid event ID parameter",
        code: "invalid_event_id",
      });
    }

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
    successResponse(res, event, "Event retrieved successfully");
  });
}
