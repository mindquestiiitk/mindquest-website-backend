/**
 * Event Role Service
 * Handles business logic for event roles
 */
import { EventRoleModel, RoleType } from "../models/event-role.model.js";
import { db } from "../config/firebase.config.js";
import { withRetry, getDocument } from "../utils/firebase-utils.js";
import { AppError } from "../utils/error.js";
import logger from "../utils/logger.js";

export class EventRoleService {
  constructor() {
    this.eventRoleModel = new EventRoleModel();
  }

  /**
   * Assign a role to a user for an event
   * @param {Object} roleData - Role data
   * @param {string} roleData.userId - User ID
   * @param {string} roleData.eventId - Event ID (optional, null for global roles)
   * @param {string} roleData.role - Role type
   * @param {Date|string} roleData.expiration - Role expiration date
   * @param {Array} roleData.permissions - Array of permissions (optional)
   * @returns {Promise<Object>} Created role
   */
  async assignRole(roleData) {
    try {
      logger.info("Assigning role to user", { roleData });

      // Validate user exists
      const userExists = await this.validateUser(roleData.userId);
      if (!userExists) {
        throw new AppError(404, "User not found", "user_not_found");
      }

      // Validate event exists if eventId is provided
      if (roleData.eventId) {
        const eventExists = await this.validateEvent(roleData.eventId);
        if (!eventExists) {
          throw new AppError(404, "Event not found", "event_not_found");
        }
      }

      // Ensure expiration is a valid date
      let expiration = roleData.expiration;
      if (typeof expiration === "string") {
        expiration = new Date(expiration);
      }

      // Validate expiration date
      if (isNaN(expiration.getTime())) {
        throw new AppError(
          400,
          "Invalid expiration date",
          "invalid_expiration_date"
        );
      }

      // Set default permissions based on role if not provided
      const permissions =
        roleData.permissions || this.getDefaultPermissions(roleData.role);

      // Create role
      const role = await this.eventRoleModel.createRole({
        ...roleData,
        expiration: expiration.toISOString(),
        permissions,
      });

      logger.info("Role assigned successfully", { role });
      return role;
    } catch (error) {
      logger.error("Failed to assign role", {
        error: error.message,
        roleData,
      });
      throw error;
    }
  }

  /**
   * Get default permissions for a role
   * @param {string} roleType - Role type
   * @returns {Array} Array of permissions
   */
  getDefaultPermissions(roleType) {
    switch (roleType) {
      case RoleType.ORGANIZER:
        return ["full_access", "assign_roles", "manage_events"];
      case RoleType.LEAD:
        return ["create_event", "manage_users", "edit_event"];
      case RoleType.SUBLEAD:
        return ["assist_lead", "edit_event"];
      case RoleType.MENTOR:
        return ["guide_volunteers", "view_all"];
      case RoleType.VOLUNTEER:
        return ["support_events"];
      default:
        return [];
    }
  }

  /**
   * Validate that a user exists
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Whether the user exists
   */
  async validateUser(userId) {
    try {
      const user = await getDocument(db, "users", userId);
      return !!user;
    } catch (error) {
      logger.error("Error validating user", {
        error: error.message,
        userId,
      });
      return false;
    }
  }

  /**
   * Validate that an event exists
   * @param {string} eventId - Event ID
   * @returns {Promise<boolean>} Whether the event exists
   */
  async validateEvent(eventId) {
    try {
      const event = await getDocument(db, "events", eventId);
      return !!event;
    } catch (error) {
      logger.error("Error validating event", {
        error: error.message,
        eventId,
      });
      return false;
    }
  }

  /**
   * Get all roles for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of roles
   */
  async getUserRoles(userId) {
    try {
      logger.info("Getting roles for user", { userId });
      const roles = await this.eventRoleModel.getUserRoles(userId);

      // Enrich roles with user and event data
      const enrichedRoles = await this.enrichRolesWithData(roles);

      logger.info(`Found ${roles.length} roles for user`, { userId });
      return enrichedRoles;
    } catch (error) {
      logger.error("Failed to get user roles", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get all roles for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Array>} Array of roles
   */
  async getEventRoles(eventId) {
    try {
      logger.info("Getting roles for event", { eventId });
      const roles = await this.eventRoleModel.getEventRoles(eventId);

      // Enrich roles with user data
      const enrichedRoles = await this.enrichRolesWithData(roles);

      logger.info(`Found ${roles.length} roles for event`, { eventId });
      return enrichedRoles;
    } catch (error) {
      logger.error("Failed to get event roles", {
        error: error.message,
        eventId,
      });
      throw error;
    }
  }

  /**
   * Enrich roles with user and event data
   * @param {Array} roles - Array of roles
   * @returns {Promise<Array>} Enriched roles
   */
  async enrichRolesWithData(roles) {
    try {
      const enrichedRoles = await Promise.all(
        roles.map(async (role) => {
          // Get user data
          const userData = await getDocument(db, "users", role.userId);

          // Get event data if eventId exists
          let eventData = null;
          if (role.eventId) {
            eventData = await getDocument(db, "events", role.eventId);
          }

          return {
            ...role,
            user: userData
              ? {
                  id: userData.id,
                  name: userData.name,
                  email: userData.email,
                  avatarId: userData.avatarId,
                }
              : null,
            event: eventData
              ? {
                  id: eventData.id,
                  title: eventData.title,
                  date: eventData.date,
                }
              : null,
          };
        })
      );

      return enrichedRoles;
    } catch (error) {
      logger.error("Failed to enrich roles with data", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all expired roles and move them to legacy
   * @returns {Promise<number>} Number of processed roles
   */
  async processExpiredRoles() {
    try {
      logger.info("Processing expired roles");

      // Deactivate expired roles
      const count = await this.eventRoleModel.deactivateExpiredRoles();

      logger.info(`Processed ${count} expired roles`);
      return count;
    } catch (error) {
      logger.error("Failed to process expired roles", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all legacy roles (expired and inactive)
   * @returns {Promise<Array>} Array of legacy roles
   */
  async getLegacyRoles() {
    try {
      logger.info("Getting legacy roles");

      const snapshot = await withRetry(() =>
        this.eventRoleModel.collection.where("isActive", "==", false).get()
      );

      const roles = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Enrich roles with user and event data
      const enrichedRoles = await this.enrichRolesWithData(roles);

      logger.info(`Found ${roles.length} legacy roles`);
      return enrichedRoles;
    } catch (error) {
      logger.error("Failed to get legacy roles", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update an existing role
   * @param {string} roleId - Role ID
   * @param {Object} roleData - Updated role data
   * @returns {Promise<Object>} Updated role
   */
  async updateRole(roleId, roleData) {
    try {
      logger.info("Updating role", { roleId, roleData });

      // Get existing role
      const existingRole = await withRetry(() =>
        this.eventRoleModel.collection.doc(roleId).get()
      );

      if (!existingRole.exists) {
        throw new AppError(404, "Role not found", "role_not_found");
      }

      // Prepare update data
      const updateData = {
        ...roleData,
        updatedAt: new Date().toISOString(),
      };

      // If role type is changing, update role level
      if (roleData.role && roleData.role !== existingRole.data().role) {
        updateData.roleLevel = this.eventRoleModel.getRoleLevel(roleData.role);
      }

      // If expiration is provided, ensure it's a valid date
      if (roleData.expiration) {
        let expiration = roleData.expiration;
        if (typeof expiration === "string") {
          expiration = new Date(expiration);
        }

        if (isNaN(expiration.getTime())) {
          throw new AppError(
            400,
            "Invalid expiration date",
            "invalid_expiration_date"
          );
        }

        updateData.expiration = expiration.toISOString();
      }

      // Update role
      await withRetry(() =>
        this.eventRoleModel.collection.doc(roleId).update(updateData)
      );

      // Get updated role
      const updatedRole = await withRetry(() =>
        this.eventRoleModel.collection.doc(roleId).get()
      );

      const role = {
        id: updatedRole.id,
        ...updatedRole.data(),
      };

      // Enrich role with user and event data
      const enrichedRole = (await this.enrichRolesWithData([role]))[0];

      logger.info("Role updated successfully", { roleId });
      return enrichedRole;
    } catch (error) {
      logger.error("Failed to update role", {
        error: error.message,
        roleId,
      });
      throw error;
    }
  }
}
