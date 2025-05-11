import { BaseModel } from "./base.model.js";

export class AdminModel extends BaseModel {
  constructor() {
    super("admins");
  }

  async createAdmin(userId) {
    try {
      return this.create({
        userId,
        createdAt: new Date(),
        lastLogin: new Date(),
      });
    } catch (error) {
      throw new Error(`Failed to create admin: ${error.message}`);
    }
  }

  async updateLastLogin(adminId) {
    try {
      return this.update(adminId, { lastLogin: new Date() });
    } catch (error) {
      throw new Error(`Failed to update last login: ${error.message}`);
    }
  }

  async getSystemStats() {
    try {
      const stats = {
        totalUsers: await this.getTotalUsers(),
        totalCounselors: await this.getTotalCounselors(),
        totalMessages: await this.getTotalMessages(),
        activeUsers: await this.getActiveUsers(),
        systemHealth: await this.getSystemHealth(),
      };
      return stats;
    } catch (error) {
      throw new Error(`Failed to get system stats: ${error.message}`);
    }
  }

  async getTotalUsers() {
    try {
      const snapshot = await this.collection.firestore
        .collection("users")
        .count()
        .get();
      return snapshot.data().count;
    } catch (error) {
      throw new Error(`Failed to get total users: ${error.message}`);
    }
  }

  async getTotalCounselors() {
    try {
      const snapshot = await this.collection.firestore
        .collection("counselors")
        .count()
        .get();
      return snapshot.data().count;
    } catch (error) {
      throw new Error(`Failed to get total counselors: ${error.message}`);
    }
  }

  async getTotalMessages() {
    try {
      const snapshot = await this.collection.firestore
        .collection("messages")
        .count()
        .get();
      return snapshot.data().count;
    } catch (error) {
      throw new Error(`Failed to get total messages: ${error.message}`);
    }
  }

  async getActiveUsers() {
    try {
      const snapshot = await this.collection.firestore
        .collection("users")
        .where("lastActive", ">=", new Date(Date.now() - 24 * 60 * 60 * 1000))
        .count()
        .get();
      return snapshot.data().count;
    } catch (error) {
      throw new Error(`Failed to get active users: ${error.message}`);
    }
  }

  async getSystemHealth() {
    try {
      return {
        status: "healthy",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get system health: ${error.message}`);
    }
  }
}
