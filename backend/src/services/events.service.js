/**
 * Events service
 * Handles business logic related to events
 */
import { db } from "../config/firebase.config.js";
import { AppError, handleFirebaseError } from "../utils/error.js";
import { withRetry, runTransaction } from "../utils/firebase-utils.js";
import logger from "../utils/logger.js";

export class EventsService {
  /**
   * Get all events from Firestore
   * @returns {Promise<Array>} Array of event objects
   */
  async getAllEvents() {
    try {
      logger.info("Fetching all events from Firestore");

      const eventsSnapshot = await withRetry(() =>
        db.collection("events").get()
      );

      logger.debug(`Found ${eventsSnapshot.size} events in Firestore`);

      const events = eventsSnapshot.docs.map((doc) => {
        return {
          id: doc.id,
          ...doc.data(),
        };
      });

      return events;
    } catch (error) {
      logger.error("Failed to fetch events", { error: error.message });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get event by ID
   * @param {string} eventId - Event ID
   * @returns {Promise<Object|null>} Event object or null if not found
   */
  async getEventById(eventId) {
    try {
      logger.info(`Fetching event with ID: ${eventId}`);

      const eventDoc = await withRetry(() =>
        db.collection("events").doc(eventId).get()
      );

      if (!eventDoc.exists) {
        logger.warn(`Event with ID ${eventId} not found`);
        return null;
      }

      logger.debug(`Found event with ID ${eventId}`);

      return {
        id: eventDoc.id,
        ...eventDoc.data(),
      };
    } catch (error) {
      logger.error(`Failed to fetch event by ID: ${eventId}`, {
        error: error.message,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Seed events collection with default data
   * @returns {Promise<boolean>} True if seeding was successful
   */
  async seedEvents() {
    try {
      logger.info("Starting events seeding process");

      // In a production environment, seeding should be done through the admin interface
      // or a dedicated script, not through the API
      logger.warn(
        "Seeding events in production should be done through the admin interface"
      );

      // For production, we don't want to automatically seed data
      // Instead, return a message indicating that seeding should be done through the admin interface
      throw new AppError(
        403,
        "Seeding events in production should be done through the admin interface or dedicated script",
        "operation_not_allowed"
      );
    } catch (error) {
      logger.error("Failed to seed events", { error: error.message });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Create a new event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created event
   */
  async createEvent(eventData) {
    try {
      logger.info("Creating new event", { eventTitle: eventData.title });

      // Generate a unique ID if not provided
      const eventId = eventData.id || `event_${Date.now()}`;

      // Add metadata
      const event = {
        ...eventData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Create event
      await withRetry(() => db.collection("events").doc(eventId).set(event));

      logger.info(`Event created successfully with ID: ${eventId}`);

      return {
        id: eventId,
        ...event,
      };
    } catch (error) {
      logger.error("Failed to create event", {
        error: error.message,
        eventTitle: eventData.title,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Update an existing event
   * @param {string} eventId - Event ID
   * @param {Object} eventData - Updated event data
   * @returns {Promise<Object>} Updated event
   */
  async updateEvent(eventId, eventData) {
    try {
      logger.info("Updating event", { eventId, eventTitle: eventData.title });

      // Check if event exists
      const eventDoc = await withRetry(() =>
        db.collection("events").doc(eventId).get()
      );

      if (!eventDoc.exists) {
        logger.warn(`Event with ID ${eventId} not found`);
        throw new AppError(404, "Event not found", "event_not_found");
      }

      // Prepare update data
      const updateData = {
        ...eventData,
        updatedAt: new Date().toISOString(),
      };

      // Update event
      await withRetry(() =>
        db.collection("events").doc(eventId).update(updateData)
      );

      // Get updated event
      const updatedEventDoc = await withRetry(() =>
        db.collection("events").doc(eventId).get()
      );

      logger.info(`Event updated successfully: ${eventId}`);

      return {
        id: updatedEventDoc.id,
        ...updatedEventDoc.data(),
      };
    } catch (error) {
      logger.error("Failed to update event", {
        error: error.message,
        eventId,
      });
      throw handleFirebaseError(error);
    }
  }
}
