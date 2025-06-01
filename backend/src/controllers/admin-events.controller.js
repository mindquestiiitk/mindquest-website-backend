/**
 * Admin Events Controller
 * Handles HTTP requests related to admin event operations
 */
import { EventRoleService } from "../services/event-role.service.js";
import { EventsService } from "../services/events.service.js";
import { catchAsync } from "../utils/error.js";
import {
  successResponse,
  notFoundResponse,
  errorResponse,
} from "../utils/response.js";
import logger from "../utils/logger.js";
import { RoleType } from "../models/event-role.model.js";

export class AdminEventsController {
  constructor() {
    this.eventRoleService = new EventRoleService();
    this.eventsService = new EventsService();
  }

  /**
   * Assign a role to a user for an event
   * @route POST /admin/events/roles
   */
  assignRole = catchAsync(async (req, res) => {
    const { userId, eventId, role, expiration, permissions } = req.body;

    logger.info("Assigning role to user", {
      userId,
      eventId,
      role,
      expiration,
      path: req.path,
      method: req.method,
    });

    // Validate required fields
    if (!userId || !role) {
      return errorResponse(
        res,
        "User ID and role are required",
        400,
        "missing_required_fields"
      );
    }

    // Validate role type
    if (!Object.values(RoleType).includes(role)) {
      return errorResponse(
        res,
        `Invalid role type. Must be one of: ${Object.values(RoleType).join(
          ", "
        )}`,
        400,
        "invalid_role_type"
      );
    }

    // Assign role
    const assignedRole = await this.eventRoleService.assignRole({
      userId,
      eventId,
      role,
      expiration:
        expiration || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default to 1 year
      permissions,
    });

    successResponse(res, assignedRole, "Role assigned successfully", 201);
  });

  /**
   * Get all roles for a user
   * @route GET /admin/events/roles/user/:userId
   */
  getUserRoles = catchAsync(async (req, res) => {
    const { userId } = req.params;

    logger.info("Getting roles for user", {
      userId,
      path: req.path,
      method: req.method,
    });

    const roles = await this.eventRoleService.getUserRoles(userId);

    successResponse(res, roles, "User roles retrieved successfully");
  });

  /**
   * Get all roles for an event
   * @route GET /admin/events/roles/event/:eventId
   */
  getEventRoles = catchAsync(async (req, res) => {
    const { eventId } = req.params;

    logger.info("Getting roles for event", {
      eventId,
      path: req.path,
      method: req.method,
    });

    const roles = await this.eventRoleService.getEventRoles(eventId);

    successResponse(res, roles, "Event roles retrieved successfully");
  });

  /**
   * Process expired roles
   * @route POST /admin/events/roles/process-expired
   */
  processExpiredRoles = catchAsync(async (req, res) => {
    logger.info("Processing expired roles", {
      path: req.path,
      method: req.method,
    });

    const count = await this.eventRoleService.processExpiredRoles();

    successResponse(res, { count }, `Processed ${count} expired roles`);
  });

  /**
   * Get legacy roles (Wall of Legacy)
   * @route GET /admin/events/roles/legacy
   */
  getLegacyRoles = catchAsync(async (req, res) => {
    logger.info("Getting legacy roles", {
      path: req.path,
      method: req.method,
    });

    const roles = await this.eventRoleService.getLegacyRoles();

    successResponse(res, roles, "Legacy roles retrieved successfully");
  });

  /**
   * Create a new event with role assignments
   * @route POST /admin/events
   */
  createEvent = catchAsync(async (req, res) => {
    const { event, roles } = req.body;

    logger.info("Creating new event with roles", {
      eventTitle: event?.title,
      rolesCount: roles?.length,
      path: req.path,
      method: req.method,
    });

    // Validate event data
    if (!event || !event.title || !event.date) {
      return errorResponse(
        res,
        "Event title and date are required",
        400,
        "missing_required_fields"
      );
    }

    // Create event
    const createdEvent = await this.eventsService.createEvent(event);

    // Assign roles if provided
    let assignedRoles = [];
    if (roles && Array.isArray(roles) && roles.length > 0) {
      assignedRoles = await Promise.all(
        roles.map(async (role) => {
          return this.eventRoleService.assignRole({
            ...role,
            eventId: createdEvent.id,
          });
        })
      );
    }

    successResponse(
      res,
      {
        event: createdEvent,
        roles: assignedRoles,
      },
      "Event created successfully with roles",
      201
    );
  });

  /**
   * Update an event with role assignments
   * @route PUT /admin/events/:eventId
   */
  updateEvent = catchAsync(async (req, res) => {
    const { eventId } = req.params;
    const { event, roles } = req.body;

    logger.info("Updating event with roles", {
      eventId,
      eventTitle: event?.title,
      rolesCount: roles?.length,
      path: req.path,
      method: req.method,
    });

    // Check if event exists
    const existingEvent = await this.eventsService.getEventById(eventId);
    if (!existingEvent) {
      return notFoundResponse(res, "Event not found");
    }

    // Update event
    const updatedEvent = await this.eventsService.updateEvent(eventId, event);

    // Update roles if provided
    let updatedRoles = [];
    if (roles && Array.isArray(roles) && roles.length > 0) {
      // First, get existing roles
      const existingRoles = await this.eventRoleService.getEventRoles(eventId);

      // Process each role
      updatedRoles = await Promise.all(
        roles.map(async (role) => {
          // If role has an ID, it's an update
          if (role.id) {
            // Find if this role exists
            const existingRole = existingRoles.find((r) => r.id === role.id);
            if (existingRole) {
              // Update existing role (using eventId and userId)
              return this.eventRoleService.updateRole(eventId, role.id, role);
            }
          }

          // Otherwise, create a new role
          return this.eventRoleService.assignRole({
            ...role,
            eventId,
          });
        })
      );
    }

    successResponse(
      res,
      {
        event: updatedEvent,
        roles: updatedRoles,
      },
      "Event updated successfully with roles"
    );
  });

  /**
   * Delete an event and its associated roles
   * @route DELETE /admin/events/:eventId
   */
  deleteEvent = catchAsync(async (req, res) => {
    const { eventId } = req.params;

    logger.info("Deleting event", {
      eventId,
      path: req.path,
      method: req.method,
    });

    // Check if event exists
    const existingEvent = await this.eventsService.getEventById(eventId);
    if (!existingEvent) {
      return notFoundResponse(res, "Event not found");
    }

    // Delete associated roles first
    await this.eventRoleService.deleteEventRoles(eventId);

    // Delete the event
    await this.eventsService.deleteEvent(eventId);

    successResponse(res, null, "Event deleted successfully");
  });

  /**
   * Search events with role filtering
   * @route GET /admin/events/search
   */
  searchEvents = catchAsync(async (req, res) => {
    const { query, role, userId } = req.query;

    logger.info("Searching events", {
      query,
      role,
      userId,
      path: req.path,
      method: req.method,
    });

    const events = await this.eventsService.searchEvents({
      query,
      role,
      userId,
    });

    successResponse(res, events, "Events search completed successfully");
  });
}
