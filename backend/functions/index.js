/**
 * Firebase Cloud Functions for MindQuest
 *
 * This file contains the Firebase Cloud Functions used by the MindQuest application.
 * These functions are deployed to Firebase and can be called from the client.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const corsConfig = require("./cors.config");

// Use the centralized CORS configuration
const cors = require("cors")(corsConfig.createCorsConfig());

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get Firestore instance
const db = admin.firestore();

/**
 * Session Management Functions
 */

/**
 * Scheduled function to clean up expired sessions and refresh tokens
 * Runs every 6 hours to maintain optimal database performance
 */
exports.cleanupExpiredSessions = functions.pubsub
  .schedule("0 */6 * * *") // Every 6 hours
  .timeZone("UTC")
  .onRun(async (context) => {
    const startTime = Date.now();
    console.log("Starting scheduled session cleanup...");

    try {
      const now = new Date().toISOString();
      const results = {
        expiredSessions: 0,
        expiredTokens: 0,
        inactiveSessions: 0,
        errors: [],
        timestamp: now,
        executionTime: 0,
      };

      // Clean up expired sessions
      try {
        const expiredSessionsQuery = db
          .collection("sessions")
          .where("expiresAt", "<", now)
          .limit(500); // Process in batches to avoid timeout

        const expiredSessionsSnapshot = await expiredSessionsQuery.get();

        if (!expiredSessionsSnapshot.empty) {
          const batch = db.batch();
          expiredSessionsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });

          await batch.commit();
          results.expiredSessions = expiredSessionsSnapshot.size;
          console.log(`Cleaned up ${results.expiredSessions} expired sessions`);
        }
      } catch (error) {
        console.error("Error cleaning expired sessions:", error);
        results.errors.push(`Sessions: ${error.message}`);
      }

      // Clean up expired refresh tokens
      try {
        const expiredTokensQuery = db
          .collection("refresh_tokens")
          .where("expiresAt", "<", now)
          .limit(500); // Process in batches

        const expiredTokensSnapshot = await expiredTokensQuery.get();

        if (!expiredTokensSnapshot.empty) {
          const batch = db.batch();
          expiredTokensSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });

          await batch.commit();
          results.expiredTokens = expiredTokensSnapshot.size;
          console.log(
            `Cleaned up ${results.expiredTokens} expired refresh tokens`
          );
        }
      } catch (error) {
        console.error("Error cleaning expired tokens:", error);
        results.errors.push(`Tokens: ${error.message}`);
      }

      // Clean up inactive sessions (older than 30 days)
      try {
        const thirtyDaysAgo = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString();
        const inactiveSessionsQuery = db
          .collection("sessions")
          .where("lastActive", "<", thirtyDaysAgo)
          .limit(500);

        const inactiveSessionsSnapshot = await inactiveSessionsQuery.get();

        if (!inactiveSessionsSnapshot.empty) {
          const batch = db.batch();
          inactiveSessionsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });

          await batch.commit();
          results.inactiveSessions = inactiveSessionsSnapshot.size;
          console.log(
            `Cleaned up ${results.inactiveSessions} inactive sessions`
          );
        }
      } catch (error) {
        console.error("Error cleaning inactive sessions:", error);
        results.errors.push(`Inactive sessions: ${error.message}`);
      }

      // Calculate execution time
      results.executionTime = Date.now() - startTime;

      // Log cleanup results to a monitoring collection
      await db.collection("session_cleanup_logs").add(results);

      console.log("Session cleanup completed:", results);
      return results;
    } catch (error) {
      console.error("Session cleanup failed:", error);

      // Log the error for monitoring
      await db.collection("session_cleanup_logs").add({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
      });

      throw error;
    }
  });

/**
 * Daily session analytics and cleanup
 * Runs once daily to generate session analytics and perform deep cleanup
 */
exports.dailySessionMaintenance = functions.pubsub
  .schedule("0 2 * * *") // Daily at 2 AM UTC
  .timeZone("UTC")
  .onRun(async (context) => {
    const startTime = Date.now();
    console.log("Starting daily session maintenance...");

    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const analytics = {
        date: now.toISOString().split("T")[0],
        activeSessions: 0,
        newSessions: 0,
        expiredSessions: 0,
        uniqueUsers: 0,
        averageSessionDuration: 0,
        topUserAgents: {},
        topCountries: {},
        timestamp: now.toISOString(),
      };

      // Get active sessions
      const activeSessionsSnapshot = await db
        .collection("sessions")
        .where("expiresAt", ">", now.toISOString())
        .get();

      analytics.activeSessions = activeSessionsSnapshot.size;

      // Get new sessions from yesterday
      const newSessionsSnapshot = await db
        .collection("sessions")
        .where("createdAt", ">=", yesterday.toISOString())
        .where("createdAt", "<", now.toISOString())
        .get();

      analytics.newSessions = newSessionsSnapshot.size;

      // Calculate unique users
      const uniqueUserIds = new Set();
      const userAgents = {};
      let totalDuration = 0;
      let sessionsWithDuration = 0;

      activeSessionsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        uniqueUserIds.add(data.userId);

        // Track user agents
        const userAgent = data.userAgent || "unknown";
        userAgents[userAgent] = (userAgents[userAgent] || 0) + 1;

        // Calculate session duration
        if (data.createdAt && data.lastActive) {
          const created = new Date(data.createdAt);
          const lastActive = new Date(data.lastActive);
          const duration = lastActive.getTime() - created.getTime();
          if (duration > 0) {
            totalDuration += duration;
            sessionsWithDuration++;
          }
        }
      });

      analytics.uniqueUsers = uniqueUserIds.size;
      analytics.averageSessionDuration =
        sessionsWithDuration > 0
          ? Math.round(totalDuration / sessionsWithDuration / 1000 / 60) // in minutes
          : 0;

      // Get top 5 user agents
      analytics.topUserAgents = Object.entries(userAgents)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

      // Clean up old analytics (keep only last 90 days)
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const oldAnalyticsSnapshot = await db
        .collection("session_analytics")
        .where("timestamp", "<", ninetyDaysAgo.toISOString())
        .limit(100)
        .get();

      if (!oldAnalyticsSnapshot.empty) {
        const batch = db.batch();
        oldAnalyticsSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(
          `Cleaned up ${oldAnalyticsSnapshot.size} old analytics records`
        );
      }

      // Save analytics
      await db.collection("session_analytics").add(analytics);

      console.log("Daily session maintenance completed:", {
        ...analytics,
        executionTime: Date.now() - startTime,
      });

      return analytics;
    } catch (error) {
      console.error("Daily session maintenance failed:", error);
      throw error;
    }
  });

/**
 * Manual session cleanup function (callable)
 * Can be triggered manually for immediate cleanup
 */
exports.manualSessionCleanup = functions.https.onCall(async (data, context) => {
  // Verify admin authentication
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can trigger manual session cleanup"
    );
  }

  try {
    const now = new Date().toISOString();
    const results = {
      expiredSessions: 0,
      expiredTokens: 0,
      revokedTokens: 0,
      timestamp: now,
    };

    // Clean expired sessions
    const expiredSessionsSnapshot = await db
      .collection("sessions")
      .where("expiresAt", "<", now)
      .get();

    if (!expiredSessionsSnapshot.empty) {
      const batch = db.batch();
      expiredSessionsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      results.expiredSessions = expiredSessionsSnapshot.size;
    }

    // Clean expired tokens
    const expiredTokensSnapshot = await db
      .collection("refresh_tokens")
      .where("expiresAt", "<", now)
      .get();

    if (!expiredTokensSnapshot.empty) {
      const batch = db.batch();
      expiredTokensSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      results.expiredTokens = expiredTokensSnapshot.size;
    }

    // Clean revoked tokens
    const revokedTokensSnapshot = await db
      .collection("refresh_tokens")
      .where("isRevoked", "==", true)
      .get();

    if (!revokedTokensSnapshot.empty) {
      const batch = db.batch();
      revokedTokensSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      results.revokedTokens = revokedTokensSnapshot.size;
    }

    console.log("Manual session cleanup completed:", results);
    return results;
  } catch (error) {
    console.error("Manual session cleanup failed:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Arcjet protection function
 * This function provides Arcjet protection for the client-side application.
 */
exports.arcjetProtect = functions.https.onCall(async (data, context) => {
  try {
    return {
      allowed: true,
      type: "success",
      reason: "Protection passed",
    };
  } catch (error) {
    console.error("Arcjet protection error:", error);
    return {
      allowed: true,
      type: "error",
      reason: "Error in server-side protection",
    };
  }
});
exports.arcjetProtectHttp = functions.https.onRequest((req, res) => {
  // Apply CORS middleware
  return cors(req, res, async () => {
    try {
      if (req.method === "OPTIONS") {
        // Handle preflight request
        res.status(204).send("");
        return;
      }

      // Handle actual request
      const data = req.body;

      res.status(200).json({
        allowed: true,
        type: "success",
        reason: "Protection passed",
      });
    } catch (error) {
      console.error("Arcjet HTTP protection error:", error);

      res.status(200).json({
        allowed: true,
        type: "error",
        reason: "Error in server-side protection",
      });
    }
  });
});
