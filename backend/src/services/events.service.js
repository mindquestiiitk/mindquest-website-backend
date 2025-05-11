/**
 * Events service
 * Handles business logic related to events
 */
import { db } from "../config/firebase.config.js";
import eventsData from "../config/events.data.js";
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

      return await runTransaction(db, async (transaction) => {
        // Clear existing events
        logger.info("Clearing existing events");
        const existingEvents = await withRetry(() =>
          db.collection("events").get()
        );

        logger.debug(`Found ${existingEvents.size} existing events to clear`);

        // Delete existing events
        existingEvents.docs.forEach((doc) => {
          transaction.delete(doc.ref);
        });

        // Add new events
        logger.info(`Adding ${eventsData.events.length} new events`);

        eventsData.events.forEach((event) => {
          logger.debug(`Adding event: ${event.title} (ID: ${event.id})`);
          const eventRef = db.collection("events").doc(event.id);
          transaction.set(eventRef, event);
        });

        return true;
      });
    } catch (error) {
      logger.error("Failed to seed events", { error: error.message });
      throw handleFirebaseError(error);
    }
  }
}
