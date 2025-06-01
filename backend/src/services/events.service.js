/**
 * Events service
 * Handles business logic related to events
 */
import { db } from "../config/firebase.config.js";
import { AppError, handleFirebaseError } from "../utils/error.js";
import { withRetry, getDocument } from "../utils/firebase-utils.js";
import logger from "../utils/logger.js";

export class EventsService {
  /**
   * Get all events from Firestore with roles
   * @returns {Promise<Array>} Array of event objects with roles
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

      // Enrich events with roles from event_roles collection
      const enrichedEvents = await this.enrichEventsWithRoles(events);

      return enrichedEvents;
    } catch (error) {
      logger.error("Failed to fetch events", { error: error.message });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get event by ID with roles
   * @param {string} eventId - Event ID
   * @returns {Promise<Object|null>} Event object with roles or null if not found
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

      const event = {
        id: eventDoc.id,
        ...eventDoc.data(),
      };

      // Enrich event with roles from event_roles collection
      const enrichedEvents = await this.enrichEventsWithRoles([event]);

      return enrichedEvents[0];
    } catch (error) {
      logger.error(`Failed to fetch event by ID: ${eventId}`, {
        error: error.message,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Create a new event
   * @param {Object} eventData - Event data
   * @param {Array} roles - Array of role assignments (optional)
   * @returns {Promise<Object>} Created event
   */
  async createEvent(eventData, roles = []) {
    try {
      logger.info("Creating new event", {
        eventTitle: eventData.title,
        rolesCount: roles.length,
      });

      // Generate a unique ID if not provided
      const eventId = eventData.id || `event_${Date.now()}`;

      // Process roles to include user details for easy searching
      const processedRoles = await this.processEventRoles(roles);

      // Add metadata and roles
      const event = {
        ...eventData,
        roles: processedRoles,
        rolesCount: {
          organizer: processedRoles.filter((r) => r.role === "organizer")
            .length,
          lead: processedRoles.filter((r) => r.role === "lead").length,
          sublead: processedRoles.filter((r) => r.role === "sublead").length,
          mentor: processedRoles.filter((r) => r.role === "mentor").length,
          volunteer: processedRoles.filter((r) => r.role === "volunteer")
            .length,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Create event
      await withRetry(() => db.collection("events").doc(eventId).set(event));

      logger.info(`Event created successfully with ID: ${eventId}`, {
        rolesAssigned: processedRoles.length,
      });

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
   * @param {Array} roles - Array of role assignments (optional)
   * @returns {Promise<Object>} Updated event
   */
  async updateEvent(eventId, eventData, roles = null) {
    try {
      logger.info("Updating event", {
        eventId,
        eventTitle: eventData.title,
        updateRoles: roles !== null,
      });

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

      // If roles are provided, process and update them
      if (roles !== null) {
        const processedRoles = await this.processEventRoles(roles);
        updateData.roles = processedRoles;
        updateData.rolesCount = {
          organizer: processedRoles.filter((r) => r.role === "organizer")
            .length,
          lead: processedRoles.filter((r) => r.role === "lead").length,
          sublead: processedRoles.filter((r) => r.role === "sublead").length,
          mentor: processedRoles.filter((r) => r.role === "mentor").length,
          volunteer: processedRoles.filter((r) => r.role === "volunteer")
            .length,
        };
      }

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

  /**
   * Process event roles to include user details for easy searching
   * @param {Array} roles - Array of role assignments
   * @returns {Promise<Array>} Processed roles with user details
   */
  async processEventRoles(roles) {
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return [];
    }

    const processedRoles = [];

    for (const role of roles) {
      try {
        // Get user details from Firebase Auth or users collection
        let userDetails = null;

        if (role.userId) {
          // Try to get user from users collection first
          const userDoc = await withRetry(() =>
            db.collection("users").doc(role.userId).get()
          );

          if (userDoc.exists) {
            userDetails = userDoc.data();
          }
        }

        // Create processed role with user details for easy searching
        const processedRole = {
          userId: role.userId,
          role: role.role,
          permissions: role.permissions || [],
          assignedAt: new Date().toISOString(),
          expiration: role.expiration || null,
          // Include user details for easy searching
          userDetails: userDetails
            ? {
                name: userDetails.name || userDetails.displayName || "Unknown",
                email: userDetails.email || "Unknown",
                avatarId: userDetails.avatarId || null,
              }
            : null,
          // Add searchable fields
          searchableText: `${role.role} ${userDetails?.name || ""} ${
            userDetails?.email || ""
          }`.toLowerCase(),
        };

        processedRoles.push(processedRole);
      } catch (error) {
        logger.warn("Failed to process role for user", {
          userId: role.userId,
          role: role.role,
          error: error.message,
        });

        // Add role without user details if user lookup fails
        processedRoles.push({
          userId: role.userId,
          role: role.role,
          permissions: role.permissions || [],
          assignedAt: new Date().toISOString(),
          expiration: role.expiration || null,
          userDetails: null,
          searchableText: role.role.toLowerCase(),
        });
      }
    }

    return processedRoles;
  }

  /**
   * Search events with optional role filtering
   * @param {Object} searchOptions - Search options
   * @param {string} searchOptions.query - Search query
   * @param {string} searchOptions.role - Role to filter by
   * @param {string} searchOptions.userId - User ID to filter by
   * @returns {Promise<Array>} Filtered events
   */
  async searchEvents(searchOptions = {}) {
    try {
      const { query, role, userId } = searchOptions;

      logger.info("Searching events", { searchOptions });

      // Get all events first
      const eventsSnapshot = await withRetry(() =>
        db.collection("events").get()
      );

      let events = eventsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Enrich events with roles from event_roles collection
      events = await this.enrichEventsWithRoles(events);

      // Apply filters
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase();
        events = events.filter((event) => {
          // Search in event details
          const eventMatch =
            event.title?.toLowerCase().includes(searchTerm) ||
            event.description?.toLowerCase().includes(searchTerm) ||
            event.location?.toLowerCase().includes(searchTerm) ||
            event.category?.toLowerCase().includes(searchTerm);

          // Search in roles
          const roleMatch = event.roles?.some(
            (role) =>
              role.role?.toLowerCase().includes(searchTerm) ||
              role.userDetails?.name?.toLowerCase().includes(searchTerm) ||
              role.userDetails?.email?.toLowerCase().includes(searchTerm)
          );

          return eventMatch || roleMatch;
        });
      }

      // Filter by role
      if (role) {
        events = events.filter((event) =>
          event.roles?.some((r) => r.role === role)
        );
      }

      // Filter by user ID
      if (userId) {
        events = events.filter((event) =>
          event.roles?.some((r) => r.userId === userId)
        );
      }

      logger.info(`Found ${events.length} events matching search criteria`);

      return events;
    } catch (error) {
      logger.error("Failed to search events", {
        error: error.message,
        searchOptions,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Enrich events with roles from subcollection and enrich with user details
   * @param {Array} events - Array of events
   * @returns {Promise<Array>} Events enriched with roles from events/{eventId}/event_roles subcollection
   */
  async enrichEventsWithRoles(events) {
    try {
      if (!events || events.length === 0) {
        return events;
      }

      logger.debug(`Enriching ${events.length} events with roles`);

      const enrichedEvents = await Promise.all(
        events.map(async (event) => {
          try {
            // Get roles from the event's subcollection: events/{eventId}/event_roles
            const rolesSnapshot = await withRetry(() =>
              db
                .collection("events")
                .doc(event.id)
                .collection("event_roles")
                .get()
            );

            const enrichedRoles = [];

            // Process each role and enrich with user data
            for (const roleDoc of rolesSnapshot.docs) {
              const roleData = roleDoc.data();
              try {
                // Get user details if userId is provided
                let userData = null;
                if (roleData.userId) {
                  userData = await getDocument(db, "users", roleData.userId);
                }

                const enrichedRole = {
                  userId: roleData.userId || null,
                  role: roleData.role,
                  permissions: roleData.permissions || [],
                  assignedAt:
                    roleData.assignedAt ||
                    roleData.createdAt ||
                    new Date().toISOString(),
                  expiration: roleData.expiration || null,
                  userDetails: userData
                    ? {
                        name:
                          userData.name || userData.displayName || "Unknown",
                        email: userData.email || "Unknown",
                        avatarId: userData.avatarId || null,
                        photoURL: userData.photoURL || null,
                        bio: userData.bio || null,
                        socialLinks: userData.socialLinks || null,
                        profileImage:
                          userData.profileImage || userData.image || null,
                        linkedin: userData.linkedin || null,
                        instagram: userData.instagram || null,
                        twitter: userData.twitter || null,
                        github: userData.github || null,
                        website: userData.website || null,
                      }
                    : roleData.userDetails || {
                        name: roleData.name || "Unknown",
                        email: roleData.email || "Unknown",
                        avatarId: null,
                        photoURL: null,
                        bio: null,
                        socialLinks: null,
                        profileImage: null,
                        linkedin: null,
                        instagram: null,
                        twitter: null,
                        github: null,
                        website: null,
                      },
                };

                enrichedRoles.push(enrichedRole);
              } catch (userError) {
                logger.warn("Failed to get user details for role", {
                  userId: roleData.userId,
                  eventId: event.id,
                  error: userError.message,
                });

                // Add role without user details if user lookup fails
                enrichedRoles.push({
                  userId: roleData.userId,
                  role: roleData.role,
                  permissions: roleData.permissions || [],
                  assignedAt:
                    roleData.assignedAt ||
                    roleData.createdAt ||
                    new Date().toISOString(),
                  expiration: roleData.expiration,
                  userDetails: {
                    name: "Unknown User",
                    email: "Unknown",
                    avatarId: null,
                    photoURL: null,
                    bio: null,
                    socialLinks: null,
                    profileImage: null,
                    linkedin: null,
                    instagram: null,
                    twitter: null,
                    github: null,
                    website: null,
                  },
                });
              }
            }

            // Calculate role counts
            const rolesCount = {
              organizer: enrichedRoles.filter((r) => r.role === "organizer")
                .length,
              lead: enrichedRoles.filter((r) => r.role === "lead").length,
              sublead: enrichedRoles.filter((r) => r.role === "sublead").length,
              mentor: enrichedRoles.filter((r) => r.role === "mentor").length,
              volunteer: enrichedRoles.filter((r) => r.role === "volunteer")
                .length,
            };

            return {
              ...event,
              roles: enrichedRoles,
              rolesCount,
            };
          } catch (roleError) {
            logger.warn("Failed to get roles for event", {
              eventId: event.id,
              error: roleError.message,
            });

            // Return event without roles if role lookup fails
            return {
              ...event,
              roles: [],
              rolesCount: {
                organizer: 0,
                lead: 0,
                sublead: 0,
                mentor: 0,
                volunteer: 0,
              },
            };
          }
        })
      );

      logger.debug(
        `Successfully enriched ${enrichedEvents.length} events with roles`
      );
      return enrichedEvents;
    } catch (error) {
      logger.error("Failed to enrich events with roles", {
        error: error.message,
      });

      // Return events without roles if enrichment fails
      return events.map((event) => ({
        ...event,
        roles: [],
        rolesCount: {
          organizer: 0,
          lead: 0,
          sublead: 0,
          mentor: 0,
          volunteer: 0,
        },
      }));
    }
  }
}
