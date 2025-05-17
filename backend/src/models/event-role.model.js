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
    super("event_roles");
  }

  /**
   * Create a new event role assignment
   * @param {Object} roleData - Role data
   * @param {string} roleData.userId - User ID
   * @param {string} roleData.eventId - Event ID (optional, null for global roles)
   * @param {string} roleData.role - Role type
   * @param {Date} roleData.expiration - Role expiration date
   * @param {Array} roleData.permissions - Array of permissions
   * @returns {Promise<Object>} Created role
   */
  async createRole(roleData) {
    try {
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

      // Use custom ID format: userId_eventId (or userId_global for global roles)
      const eventIdPart = roleData.eventId || "global";
      const docId = `${roleData.userId}_${eventIdPart}`;

      // Create or update the role document
      await withRetry(() => this.collection.doc(docId).set(role));

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
   * Get all roles for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of roles
   */
  async getUserRoles(userId) {
    try {
      const snapshot = await withRetry(() =>
        this.collection.where("userId", "==", userId).get()
      );

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
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
      const snapshot = await withRetry(() =>
        this.collection.where("eventId", "==", eventId).get()
      );

      return snapshot.docs.map((doc) => ({
        id: doc.id,
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
   * Get all expired roles
   * @returns {Promise<Array>} Array of expired roles
   */
  async getExpiredRoles() {
    try {
      const now = new Date().toISOString();
      const snapshot = await withRetry(() =>
        this.collection
          .where("expiration", "<", now)
          .where("isActive", "==", true)
          .get()
      );

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      logger.error("Failed to get expired roles", {
        error: error.message,
      });
      throw new Error(`Failed to get expired roles: ${error.message}`);
    }
  }

  /**
   * Update role expiration
   * @param {string} roleId - Role ID
   * @param {Date} expiration - New expiration date
   * @returns {Promise<Object>} Updated role
   */
  async updateRoleExpiration(roleId, expiration) {
    try {
      await withRetry(() =>
        this.collection.doc(roleId).update({
          expiration: expiration.toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );

      const updatedRole = await this.findById(roleId);
      return updatedRole;
    } catch (error) {
      logger.error("Failed to update role expiration", {
        error: error.message,
        roleId,
      });
      throw new Error(`Failed to update role expiration: ${error.message}`);
    }
  }

  /**
   * Deactivate expired roles
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
        const roleRef = this.collection.doc(role.id);
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
}
