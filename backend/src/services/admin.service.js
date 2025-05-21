/**
 * Admin service
 * Handles business logic related to admin operations
 */
import { db } from "../config/firebase.config.js";
import { AppError, handleFirebaseError } from "../utils/error.js";
import { withRetry } from "../utils/firebase-utils.js";
import logger from "../utils/logger.js";

export class AdminService {
  /**
   * Get system settings
   * @returns {Promise<Object>} System settings
   */
  async getSystemSettings() {
    try {
      logger.info("Fetching system settings");

      const settingsDoc = await withRetry(() =>
        db.collection("settings").doc("system").get()
      );

      return settingsDoc.exists ? settingsDoc.data() : {};
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

      const [users, counselors, messages] = await Promise.all([
        withRetry(() => db.collection("users").count().get()),
        withRetry(() => db.collection("counselors").count().get()),
        withRetry(() => db.collection("messages").count().get()),
      ]);

      const stats = {
        totalUsers: users.data().count,
        totalCounselors: counselors.data().count,
        totalMessages: messages.data().count,
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

      const snapshot = await withRetry(() =>
        db.collection("users").count().get()
      );

      const count = snapshot.data().count;
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

      const snapshot = await withRetry(() =>
        db.collection("counselors").count().get()
      );

      const count = snapshot.data().count;
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

      const snapshot = await withRetry(() =>
        db.collection("messages").count().get()
      );

      const count = snapshot.data().count;
      logger.debug(`Message count: ${count}`);

      return count;
    } catch (error) {
      logger.error("Failed to get message count", { error: error.message });
      throw handleFirebaseError(error);
    }
  }
}
