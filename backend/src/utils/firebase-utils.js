/**
 * Firebase utility functions
 * Provides helper functions for Firebase operations
 */

import logger from "./logger.js";

/**
 * Retry a Firebase operation with exponential backoff
 * @param {Function} operation - Function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.initialDelay - Initial delay in milliseconds
 * @param {number} options.maxDelay - Maximum delay in milliseconds
 * @returns {Promise<any>} - Result of the operation
 */
export const withRetry = async (
  operation,
  { maxRetries = 3, initialDelay = 100, maxDelay = 3000 } = {}
) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Only retry on specific Firebase errors that are transient
      // CRITICAL: Never retry resource-exhausted errors to prevent quota consumption loops
      const isTransient =
        error.code === "unavailable" ||
        error.code === "deadline-exceeded" ||
        error.code === "internal" ||
        error.code === "cancelled" ||
        error.message?.includes("network error");

      // Explicitly check for quota exhaustion and never retry
      const isQuotaExhausted =
        error.code === "resource-exhausted" ||
        error.code === 8 ||
        String(error.code) === "8" ||
        error.message?.includes("Quota exceeded") ||
        error.message?.includes("RESOURCE_EXHAUSTED");

      if (!isTransient || attempt === maxRetries || isQuotaExhausted) {
        if (isQuotaExhausted) {
          logger.error("Firebase quota exhausted - not retrying", {
            error: error.message,
            code: error.code,
            attempt,
          });
        } else {
          logger.error("Firebase operation failed permanently", {
            error: error.message,
            code: error.code,
            attempt,
          });
        }
        throw error;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt - 1) * (0.5 + Math.random()),
        maxDelay
      );

      logger.warn(`Retrying Firebase operation`, {
        attempt,
        maxRetries,
        delay: Math.round(delay),
        error: error.message,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Run a Firestore transaction with retry
 * @param {Object} db - Firestore instance
 * @param {Function} transactionFn - Transaction function
 * @param {Object} options - Retry options
 * @returns {Promise<any>} - Result of the transaction
 */
export const runTransaction = async (db, transactionFn, options = {}) => {
  return withRetry(() => db.runTransaction(transactionFn), options);
};

/**
 * Check if a document exists in Firestore
 * @param {Object} db - Firestore instance
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @returns {Promise<boolean>} - Whether the document exists
 */
export const documentExists = async (db, collection, docId) => {
  try {
    const docRef = db.collection(collection).doc(docId);
    const doc = await withRetry(() => docRef.get());
    return doc.exists;
  } catch (error) {
    logger.error("Error checking if document exists", {
      collection,
      docId,
      error: error.message,
    });
    return false;
  }
};

/**
 * Get a document from Firestore with retry
 * @param {Object} db - Firestore instance
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @returns {Promise<Object|null>} - Document data or null if not found
 */
export const getDocument = async (db, collection, docId) => {
  try {
    const docRef = db.collection(collection).doc(docId);
    const doc = await withRetry(() => docRef.get());

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    logger.error("Error getting document", {
      collection,
      docId,
      error: error.message,
    });
    throw error;
  }
};
