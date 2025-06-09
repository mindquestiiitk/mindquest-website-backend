/**
 * Admin service
 * Handles business logic related to admin operations
 */
import { db } from "../config/firebase.config.js";
import { handleFirebaseError } from "../utils/error.js";
import { withRetry } from "../utils/firebase-utils.js";
import logger from "../utils/logger.js";
import { BaseService } from "./base.service.js";

export class AdminService extends BaseService {
  constructor() {
    super("settings"); // Use settings as the primary collection for admin operations
  }

  /**
   * Get system settings
   * @returns {Promise<Object>} System settings
   */
  async getSystemSettings() {
    try {
      logger.info("Fetching system settings");

      // Use the base service method for consistency
      const settings = await this.getById("system");
      return settings || {};
    } catch (error) {
      logger.error("Failed to get system settings", { error: error.message });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Update system settings
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  async updateSystemSettings(settings) {
    try {
      logger.info("Updating system settings");
      logger.debug("Settings update data", { settings });

      await withRetry(() =>
        db.collection("settings").doc("system").set(settings, { merge: true })
      );

      return this.getSystemSettings();
    } catch (error) {
      logger.error("Failed to update system settings", {
        error: error.message,
      });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get analytics data
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics() {
    try {
      logger.info("Fetching analytics data");

      const analyticsDoc = await withRetry(() =>
        db.collection("analytics").doc("current").get()
      );

      return analyticsDoc.exists ? analyticsDoc.data() : {};
    } catch (error) {
      logger.error("Failed to get analytics", { error: error.message });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get system logs
   * @param {number} limit - Maximum number of logs to retrieve
   * @returns {Promise<Array>} Array of log objects
   */
  async getSystemLogs(limit = 100) {
    try {
      logger.info("Fetching system logs", { limit });

      const logsRef = db.collection("logs");
      const snapshot = await withRetry(() =>
        logsRef.orderBy("timestamp", "desc").limit(limit).get()
      );

      logger.debug(`Retrieved ${snapshot.docs.length} system logs`);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      logger.error("Failed to get system logs", { error: error.message });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get system statistics
   * @returns {Promise<Object>} System statistics
   */
  async getSystemStats() {
    try {
      logger.info("Fetching system statistics");

      // Use base service count methods for consistency
      const [totalUsers, totalCounselors, totalMessages] = await Promise.all([
        new BaseService("users").count(),
        new BaseService("counselors").count(),
        new BaseService("messages").count(),
      ]);

      const stats = {
        totalUsers,
        totalCounselors,
        totalMessages,
        timestamp: new Date().toISOString(),
      };

      logger.debug("System statistics retrieved", { stats });

      return stats;
    } catch (error) {
      logger.error("Failed to get system stats", { error: error.message });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get user count
   * @returns {Promise<number>} User count
   */
  async getUserCount() {
    try {
      logger.info("Fetching user count");
      const userService = new BaseService("users");
      const count = await userService.count();
      logger.debug(`User count: ${count}`);
      return count;
    } catch (error) {
      logger.error("Failed to get user count", { error: error.message });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get counselor count
   * @returns {Promise<number>} Counselor count
   */
  async getCounselorCount() {
    try {
      logger.info("Fetching counselor count");
      const counselorService = new BaseService("counselors");
      const count = await counselorService.count();
      logger.debug(`Counselor count: ${count}`);
      return count;
    } catch (error) {
      logger.error("Failed to get counselor count", { error: error.message });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get message count
   * @returns {Promise<number>} Message count
   */
  async getMessageCount() {
    try {
      logger.info("Fetching message count");
      const messageService = new BaseService("messages");
      const count = await messageService.count();
      logger.debug(`Message count: ${count}`);
      return count;
    } catch (error) {
      logger.error("Failed to get message count", { error: error.message });
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get all users for admin dashboard
   * @returns {Promise<Array>} Array of users
   */
  async getAllUsers() {
    try {
      logger.info("Fetching all users for admin dashboard");

      const snapshot = await withRetry(() =>
        db.collection("users").limit(100).get()
      );

      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Remove sensitive data
        password: undefined,
        refreshTokens: undefined,
      }));

      logger.debug(`Retrieved ${users.length} users for admin dashboard`);
      return users;
    } catch (error) {
      logger.error("Failed to get all users", { error: error.message });
      throw handleFirebaseError(error);
    }
  }
}
