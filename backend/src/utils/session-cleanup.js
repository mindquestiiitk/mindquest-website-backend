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

import { db, auth } from "../config/firebase.config.js";
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
 * Run token cleanup task
 * @returns {Promise<Object>} Results of cleanup operations
 */
export async function runTokenCleanup() {
  try {
    logger.info("Starting token cleanup");

    const expiredCount = await cleanupExpiredTokens();

    const results = {
      expiredTokens: expiredCount,
      timestamp: new Date().toISOString(),
    };

    logger.info("Token cleanup completed", results);
    return results;
  } catch (error) {
    logger.error("Token cleanup failed", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
