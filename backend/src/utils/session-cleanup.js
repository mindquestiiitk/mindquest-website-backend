/**
 * Session Cleanup Utility
 *
 * This utility provides functions to clean up expired sessions.
 *
 * Note: For a production Firebase app, consider using Firebase Cloud Functions
 * with scheduled triggers instead of this custom implementation.
 *
 * Example Cloud Function:
 * exports.cleanupSessions = functions.pubsub.schedule('every 24 hours').onRun(async context => {
 *   // Cleanup code here
 * });
 */

import { db } from "../config/firebase.config.js";
import logger from "./logger.js";

/**
 * Clean up expired refresh tokens
 * @returns {Promise<number>} Number of tokens cleaned up
 */
export async function cleanupExpiredTokens() {
  try {
    const now = new Date().toISOString();
    const tokensRef = db.collection("refresh_tokens");

    // Find expired tokens
    const expiredTokensSnapshot = await tokensRef
      .where("expiresAt", "<", now)
      .get();

    if (expiredTokensSnapshot.empty) {
      logger.info("No expired tokens found");
      return 0;
    }

    // Delete expired tokens in batches
    const batch = db.batch();
    let count = 0;

    expiredTokensSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    await batch.commit();

    logger.info(`Cleaned up ${count} expired tokens`);
    return count;
  } catch (error) {
    logger.error("Error cleaning up expired tokens", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Clean up expired sessions
 * @returns {Promise<number>} Number of sessions cleaned up
 */
export async function cleanupExpiredSessions() {
  try {
    const now = new Date().toISOString();
    const sessionsRef = db.collection("sessions");

    // Find expired sessions
    const expiredSessionsSnapshot = await sessionsRef
      .where("expiresAt", "<", now)
      .get();

    if (expiredSessionsSnapshot.empty) {
      logger.info("No expired sessions found");
      return 0;
    }

    // Delete expired sessions in batches
    const batch = db.batch();
    let count = 0;

    expiredSessionsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    await batch.commit();

    logger.info(`Cleaned up ${count} expired sessions`);
    return count;
  } catch (error) {
    logger.error("Error cleaning up expired sessions", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Run complete session and token cleanup
 * @returns {Promise<Object>} Results of cleanup operations
 */
export async function runTokenCleanup() {
  try {
    logger.info("Starting session and token cleanup");

    const [expiredTokens, expiredSessions] = await Promise.all([
      cleanupExpiredTokens(),
      cleanupExpiredSessions(),
    ]);

    const results = {
      expiredTokens,
      expiredSessions,
      total: expiredTokens + expiredSessions,
      timestamp: new Date().toISOString(),
    };

    logger.info("Session and token cleanup completed", results);
    return results;
  } catch (error) {
    logger.error("Session and token cleanup failed", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
