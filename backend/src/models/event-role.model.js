/**
 * Event Role Model
 * Handles database operations for event roles
 */
import { BaseModel } from "./base.model.js";
import { db } from "../config/firebase.config.js";
import { withRetry } from "../utils/firebase-utils.js";
import logger from "../utils/logger.js";

// Define role hierarchy levels
export const RoleLevel = {
  ORGANIZER: 5,
  LEAD: 4,
  SUBLEAD: 3,
  MENTOR: 2,
  VOLUNTEER: 1,
};

// Define role types
export const RoleType = {
  ORGANIZER: "organizer",
  LEAD: "lead",
  SUBLEAD: "sublead",
  MENTOR: "mentor",
  VOLUNTEER: "volunteer",
};

export class EventRoleModel extends BaseModel {
  constructor() {
    super("events"); // Base collection is events, roles will be subcollections
  }

  /**
   * Get event roles subcollection reference
   * @param {string} eventId - Event ID
   * @returns {Object} Firestore subcollection reference
   */
  getEventRolesCollection(eventId) {
    return this.collection.doc(eventId).collection("event_roles");
  }

  /**
   * Create a new event role assignment
   * @param {Object} roleData - Role data
   * @param {string} roleData.userId - User ID
   * @param {string} roleData.eventId - Event ID (required for subcollection approach)
   * @param {string} roleData.role - Role type
   * @param {Date} roleData.expiration - Role expiration date
   * @param {Array} roleData.permissions - Array of permissions
   * @returns {Promise<Object>} Created role
   */
  async createRole(roleData) {
    try {
      // Validate required fields
      if (!roleData.eventId) {
        throw new Error("Event ID is required for role assignment");
      }

      if (!roleData.userId) {
        throw new Error("User ID is required for role assignment");
      }

      // Validate role type
      if (!Object.values(RoleType).includes(roleData.role)) {
        throw new Error(`Invalid role type: ${roleData.role}`);
      }

      // Set role level based on role type
      const roleLevel = this.getRoleLevel(roleData.role);

      // Create role with additional metadata
      const role = {
        ...roleData,
        roleLevel,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };

      // Get the event roles subcollection
      const eventRolesCollection = this.getEventRolesCollection(
        roleData.eventId
      );

      // Use userId as document ID in the subcollection
      const docId = roleData.userId;

      // Create or update the role document in the subcollection
      await withRetry(() => eventRolesCollection.doc(docId).set(role));

      return { id: docId, ...role };
    } catch (error) {
      logger.error("Failed to create event role", {
        error: error.message,
        roleData,
      });
      throw new Error(`Failed to create event role: ${error.message}`);
    }
  }

  /**
   * Get role level based on role type
   * @param {string} roleType - Role type
   * @returns {number} Role level
   */
  getRoleLevel(roleType) {
    switch (roleType) {
      case RoleType.ORGANIZER:
        return RoleLevel.ORGANIZER;
      case RoleType.LEAD:
        return RoleLevel.LEAD;
      case RoleType.SUBLEAD:
        return RoleLevel.SUBLEAD;
      case RoleType.MENTOR:
        return RoleLevel.MENTOR;
      case RoleType.VOLUNTEER:
        return RoleLevel.VOLUNTEER;
      default:
        return 0;
    }
  }

  /**
   * Get all roles for a user across all events
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of roles
   */
  async getUserRoles(userId) {
    try {
      // Since roles are now in subcollections, we need to query all events
      // and check their event_roles subcollections for this user
      const eventsSnapshot = await withRetry(() => this.collection.get());

      const userRoles = [];

      // Check each event's roles subcollection for this user
      for (const eventDoc of eventsSnapshot.docs) {
        try {
          const eventId = eventDoc.id;
          const eventRolesCollection = this.getEventRolesCollection(eventId);
          const userRoleDoc = await withRetry(() =>
            eventRolesCollection.doc(userId).get()
          );

          if (userRoleDoc.exists) {
            userRoles.push({
              id: userRoleDoc.id,
              eventId: eventId,
              ...userRoleDoc.data(),
            });
          }
        } catch (error) {
          // Log but don't fail the entire operation for one event
          logger.warn("Failed to check user role in event", {
            eventId: eventDoc.id,
            userId,
            error: error.message,
          });
        }
      }

      return userRoles;
    } catch (error) {
      logger.error("Failed to get user roles", {
        error: error.message,
        userId,
      });
      throw new Error(`Failed to get user roles: ${error.message}`);
    }
  }

  /**
   * Get all roles for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Array>} Array of roles
   */
  async getEventRoles(eventId) {
    try {
      // Get the event roles subcollection
      const eventRolesCollection = this.getEventRolesCollection(eventId);
      const snapshot = await withRetry(() => eventRolesCollection.get());

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        eventId: eventId, // Add eventId to the returned data
        ...doc.data(),
      }));
    } catch (error) {
      logger.error("Failed to get event roles", {
        error: error.message,
        eventId,
      });
      throw new Error(`Failed to get event roles: ${error.message}`);
    }
  }

  /**
   * Get all expired roles across all events
   * @returns {Promise<Array>} Array of expired roles
   */
  async getExpiredRoles() {
    try {
      const now = new Date().toISOString();
      const expiredRoles = [];

      // Get all events
      const eventsSnapshot = await withRetry(() => this.collection.get());

      // Check each event's roles subcollection for expired roles
      for (const eventDoc of eventsSnapshot.docs) {
        try {
          const eventId = eventDoc.id;
          const eventRolesCollection = this.getEventRolesCollection(eventId);

          const snapshot = await withRetry(() =>
            eventRolesCollection
              .where("expiration", "<", now)
              .where("isActive", "==", true)
              .get()
          );

          snapshot.docs.forEach((doc) => {
            expiredRoles.push({
              id: doc.id,
              eventId: eventId,
              ...doc.data(),
            });
          });
        } catch (error) {
          // Log but don't fail the entire operation for one event
          logger.warn("Failed to check expired roles in event", {
            eventId: eventDoc.id,
            error: error.message,
          });
        }
      }

      return expiredRoles;
    } catch (error) {
      logger.error("Failed to get expired roles", {
        error: error.message,
      });
      throw new Error(`Failed to get expired roles: ${error.message}`);
    }
  }

  /**
   * Update role expiration
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID (role ID in subcollection)
   * @param {Date} expiration - New expiration date
   * @returns {Promise<Object>} Updated role
   */
  async updateRoleExpiration(eventId, userId, expiration) {
    try {
      const eventRolesCollection = this.getEventRolesCollection(eventId);

      await withRetry(() =>
        eventRolesCollection.doc(userId).update({
          expiration: expiration.toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );

      // Get updated role
      const updatedRoleDoc = await withRetry(() =>
        eventRolesCollection.doc(userId).get()
      );

      if (!updatedRoleDoc.exists) {
        throw new Error("Role not found after update");
      }

      return {
        id: updatedRoleDoc.id,
        eventId: eventId,
        ...updatedRoleDoc.data(),
      };
    } catch (error) {
      logger.error("Failed to update role expiration", {
        error: error.message,
        eventId,
        userId,
      });
      throw new Error(`Failed to update role expiration: ${error.message}`);
    }
  }

  /**
   * Deactivate expired roles across all events
   * @returns {Promise<number>} Number of deactivated roles
   */
  async deactivateExpiredRoles() {
    try {
      const expiredRoles = await this.getExpiredRoles();

      if (expiredRoles.length === 0) {
        return 0;
      }

      const batch = db.batch();

      expiredRoles.forEach((role) => {
        const eventRolesCollection = this.getEventRolesCollection(role.eventId);
        const roleRef = eventRolesCollection.doc(role.id);
        batch.update(roleRef, {
          isActive: false,
          updatedAt: new Date().toISOString(),
        });
      });

      await withRetry(() => batch.commit());

      return expiredRoles.length;
    } catch (error) {
      logger.error("Failed to deactivate expired roles", {
        error: error.message,
      });
      throw new Error(`Failed to deactivate expired roles: ${error.message}`);
    }
  }

  /**
   * Update a role in a specific event
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID (role ID in subcollection)
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated role
   */
  async updateRole(eventId, userId, updateData) {
    try {
      const eventRolesCollection = this.getEventRolesCollection(eventId);

      const updatePayload = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      await withRetry(() =>
        eventRolesCollection.doc(userId).update(updatePayload)
      );

      // Get updated role
      const updatedRoleDoc = await withRetry(() =>
        eventRolesCollection.doc(userId).get()
      );

      if (!updatedRoleDoc.exists) {
        throw new Error("Role not found after update");
      }

      return {
        id: updatedRoleDoc.id,
        eventId: eventId,
        ...updatedRoleDoc.data(),
      };
    } catch (error) {
      logger.error("Failed to update role", {
        error: error.message,
        eventId,
        userId,
      });
      throw new Error(`Failed to update role: ${error.message}`);
    }
  }

  /**
   * Delete a role from a specific event
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID (role ID in subcollection)
   * @returns {Promise<boolean>} Success status
   */
  async deleteRole(eventId, userId) {
    try {
      const eventRolesCollection = this.getEventRolesCollection(eventId);
      await withRetry(() => eventRolesCollection.doc(userId).delete());
      return true;
    } catch (error) {
      logger.error("Failed to delete role", {
        error: error.message,
        eventId,
        userId,
      });
      throw new Error(`Failed to delete role: ${error.message}`);
    }
  }
}
