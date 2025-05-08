import { getFirestore } from "firebase-admin/firestore";
import { db } from "../config/firebase.config.js";

const firestoreDb = getFirestore();

export class AdminService {
  async getSystemSettings() {
    try {
      const settingsDoc = await firestoreDb
        .collection("settings")
        .doc("system")
        .get();
      return settingsDoc.data() || {};
    } catch (error) {
      throw new Error(`Failed to get system settings: ${error.message}`);
    }
  }

  async updateSystemSettings(settings) {
    try {
      await firestoreDb
        .collection("settings")
        .doc("system")
        .set(settings, { merge: true });
      return this.getSystemSettings();
    } catch (error) {
      throw new Error(`Failed to update system settings: ${error.message}`);
    }
  }

  async getAnalytics() {
    try {
      const analyticsDoc = await firestoreDb
        .collection("analytics")
        .doc("current")
        .get();
      return analyticsDoc.data() || {};
    } catch (error) {
      throw new Error(`Failed to get analytics: ${error.message}`);
    }
  }

  async getSystemLogs(limit = 100) {
    try {
      const logsRef = firestoreDb.collection("logs");
      const snapshot = await logsRef
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      throw new Error(`Failed to get system logs: ${error.message}`);
    }
  }

  async getSystemStats() {
    try {
      const [users, counselors, messages] = await Promise.all([
        db.collection("users").count().get(),
        db.collection("counselors").count().get(),
        db.collection("messages").count().get(),
      ]);

      return {
        totalUsers: users.data().count,
        totalCounselors: counselors.data().count,
        totalMessages: messages.data().count,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to get system stats: ${error.message}`);
    }
  }

  async getUserCount() {
    try {
      const snapshot = await db.collection("users").count().get();
      return snapshot.data().count;
    } catch (error) {
      throw new Error(`Failed to get user count: ${error.message}`);
    }
  }

  async getCounselorCount() {
    try {
      const snapshot = await db.collection("counselors").count().get();
      return snapshot.data().count;
    } catch (error) {
      throw new Error(`Failed to get counselor count: ${error.message}`);
    }
  }

  async getMessageCount() {
    try {
      const snapshot = await db.collection("messages").count().get();
      return snapshot.data().count;
    } catch (error) {
      throw new Error(`Failed to get message count: ${error.message}`);
    }
  }
}
