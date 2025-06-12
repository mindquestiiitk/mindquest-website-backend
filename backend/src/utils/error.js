/**
 * Unified Error Handling Utilities
 *
 * This module provides a centralized error handling system for the application,
 * with specialized handlers for different error types.
 */

import logger from "./logger.js";
import config from "../config/config.js";

/**
 * Error categories
 */
export const ErrorCategory = {
  AUTHENTICATION: "authentication",
  PERMISSION: "permission",
  NOT_FOUND: "not_found",
  VALIDATION: "validation",
  NETWORK: "network",
  RATE_LIMIT: "rate_limit",
  UNAVAILABLE: "unavailable",
  INTERNAL: "internal",
  UNKNOWN: "unknown",
};

/**
 * Custom error class for operational errors
 * These are errors that we expect to happen and can handle gracefully
 */
export class AppError extends Error {
  constructor(
    statusCode,
    message,
    errorCode = "unknown_error",
    category = ErrorCategory.UNKNOWN
  ) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
    this.errorCode = errorCode;
    this.category = category;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Helper function to create errors with consistent format
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} errorCode - Error code for client identification
 * @param {string} category - Error category
 * @returns {AppError} - Formatted error object
 */
export const createError = (statusCode, message, errorCode, category) => {
  return new AppError(statusCode, message, errorCode, category);
};

/**
 * Async error handler for route handlers
 * Wraps async functions to catch errors and pass them to the error middleware
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Express middleware function
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Creates a standardized error response object
 * @param {Error} error - The error object
 * @returns {Object} - Standardized error response
 */
export const createErrorResponse = (error) => {
  // Generate a unique error ID for tracking
  const errorId = generateErrorId();

  // Determine error category
  const category = error.category || ErrorCategory.UNKNOWN;

  return {
    success: false,
    error: {
      message: error.message,
      code: error.code || error.errorCode || "unknown_error",
      category: category,
      status: error.statusCode || 500,
    },
    errorId,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Generates a unique error ID for tracking
 * @returns {string} Unique error ID
 */
function generateErrorId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 7).toUpperCase()
  );
}

/**
 * Determines if an error is retryable
 * @param {string} errorCode - Error code
 * @param {string} category - Error category
 * @returns {boolean} Whether the error is retryable
 */
export function isRetryableError(errorCode, category) {
  // CRITICAL: Never retry quota exhaustion errors to prevent infinite loops
  if (
    errorCode === 8 ||
    String(errorCode) === "8" ||
    errorCode === "resource-exhausted" ||
    errorCode === "firestore/resource-exhausted" ||
    String(errorCode).includes("RESOURCE_EXHAUSTED") ||
    String(errorCode).includes("Quota exceeded")
  ) {
    return false;
  }

  // If category is provided, use it
  if (category) {
    return [
      ErrorCategory.NETWORK,
      ErrorCategory.UNAVAILABLE,
      // Note: RATE_LIMIT is still retryable for non-quota errors
      ErrorCategory.RATE_LIMIT,
    ].includes(category);
  }

  // Otherwise, try to determine from error code
  if (errorCode) {
    // Network errors
    if (
      errorCode === "network_error" ||
      errorCode === "auth/network-request-failed" ||
      errorCode === "firestore/network-request-failed"
    ) {
      return true;
    }

    // Rate limit errors (but NOT quota exhaustion)
    if (
      errorCode === "rate_limit_exceeded" ||
      errorCode === "auth/too-many-requests"
    ) {
      return true;
    }

    // Service unavailable errors
    if (
      errorCode === "service_unavailable" ||
      errorCode === "firestore/unavailable"
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Executes an operation with retry logic for transient errors
 * @param {Function} operation - Operation to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in milliseconds (default: 1000)
 * @param {Object} context - Additional context for logging
 * @returns {Promise<*>} Result of the operation
 */
export async function executeWithRetry(operation, options = {}, context = {}) {
  const maxRetries = options.maxRetries || 3;
  const baseDelay = options.baseDelay || 1000;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // If error is not retryable or we've reached max retries, throw
      if (
        !isRetryableError(error.code || error.errorCode, error.category) ||
        attempt === maxRetries
      ) {
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt);

      // Log retry attempt
      logger.info("Retrying operation", {
        attempt: attempt + 1,
        maxRetries,
        delay,
        errorCode: error.code || error.errorCode,
        category: error.category,
        ...context,
      });

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached due to the throw in the loop,
  // but just in case
  throw lastError;
}

/**
 * Sanitizes error messages for production
 * @param {Error} error - The error object
 * @returns {string} Sanitized error message
 */
export function sanitizeErrorMessage(error) {
  if (config.isDevelopment) {
    return error.message;
  }

  // In production, use generic messages based on status code
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    return "An unexpected server error occurred. Our team has been notified.";
  } else if (statusCode === 404) {
    return "The requested resource was not found.";
  } else if (statusCode === 403) {
    return "You don't have permission to access this resource.";
  } else if (statusCode === 401) {
    return "Authentication is required to access this resource.";
  } else {
    return "An error occurred while processing your request.";
  }
}

/**
 * Maps Firebase error codes to user-friendly error messages
 * These messages are designed to be clear, helpful, and actionable for users
 */
const firebaseErrorMessages = {
  // Authentication errors
  "auth/email-already-in-use":
    "This email address is already registered. Please use a different email or try logging in with this email instead.",
  "auth/invalid-email":
    "Please enter a valid email address format (e.g., name@example.com).",
  "auth/user-disabled":
    "Your account has been disabled. Please contact support at support@mindquest.iiitkottayam.ac.in for assistance.",
  "auth/user-not-found":
    "We couldn't find an account with this email address. Please check your spelling or create a new account.",
  "auth/wrong-password":
    "The password you entered is incorrect. Please try again or use the 'Forgot Password' option if you can't remember.",
  "auth/invalid-credential":
    "Your login information appears to be incorrect. Please double-check your email and password.",
  "auth/invalid-verification-code":
    "The verification code you entered is invalid. Please check and try again, or request a new code.",
  "auth/invalid-verification-id":
    "Your verification session has expired. Please request a new verification code.",
  "auth/weak-password":
    "Your password must be at least 8 characters long and include uppercase letters, numbers, and symbols for better security.",
  "auth/requires-recent-login":
    "For security reasons, this action requires you to log in again. Please sign out and sign back in to continue.",
  "auth/too-many-requests":
    "For security reasons, access from this account has been temporarily limited. Please try again later or reset your password.",
  "auth/operation-not-allowed":
    "This sign-in method is not currently enabled. Please contact support or try another method.",
  "auth/network-request-failed":
    "We couldn't connect to the authentication service. Please check your internet connection and try again.",
  "auth/popup-closed-by-user":
    "The sign-in window was closed before completing the process. Please try again and keep the window open.",
  "auth/unauthorized-domain":
    "This website is not authorized to use this authentication method. Please contact support.",
  "auth/expired-action-code":
    "This link has expired. Please request a new link to reset your password or verify your email.",
  "auth/invalid-action-code":
    "This link is invalid or has already been used. Please request a new link.",
  "auth/quota-exceeded":
    "Our service is experiencing high demand. Please try again in a few minutes.",
  "auth/missing-verification-code":
    "Please enter the verification code that was sent to you.",
  "auth/invalid-phone-number":
    "Please enter a valid phone number with country code (e.g., +91 for India).",
  "auth/captcha-check-failed":
    "The security verification failed. Please try again or use a different sign-in method.",
  "auth/missing-phone-number": "Please enter your phone number to continue.",
  "auth/invalid-recipient-email":
    "The email address you entered appears to be invalid. Please check and try again.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email but using a different sign-in method. Please use the original method.",
  "auth/email-already-exists":
    "This email is already registered. Please use a different email address.",
  "auth/invalid-password":
    "Your password must be at least 8 characters long and include a mix of letters, numbers, and symbols.",
  "auth/invalid-display-name":
    "Please enter a valid name without special characters or numbers.",
  "auth/session-expired":
    "Your login session has expired for security reasons. Please sign in again to continue.",
  "auth/id-token-expired":
    "Your login session has timed out. Please sign in again to continue.",
  "auth/id-token-revoked":
    "Your login session has been revoked for security reasons. Please sign in again.",
  "auth/multi-factor-auth-required":
    "Additional verification is required. Please complete the second authentication step.",

  // Firestore errors
  "firestore/permission-denied":
    "You don't have permission to access this information. If you believe this is a mistake, please contact an administrator.",
  "firestore/not-found":
    "The information you're looking for doesn't exist or may have been deleted.",
  "firestore/already-exists":
    "This information already exists and cannot be created again.",
  "firestore/failed-precondition":
    "This operation cannot be completed right now. Please refresh the page and try again.",
  "firestore/aborted": "The operation was interrupted. Please try again.",
  "firestore/out-of-range":
    "The requested operation is outside the valid range.",
  "firestore/unavailable":
    "Our database service is temporarily unavailable. Please try again in a few moments.",
  "firestore/data-loss":
    "We encountered a problem with your data. Please contact support.",
  "firestore/unauthenticated":
    "You need to be logged in to perform this action. Please sign in and try again.",
  "firestore/cancelled": "This operation was cancelled. Please try again.",
  "firestore/unknown":
    "An unknown error occurred. Please try again or contact support if the problem persists.",
  "firestore/deadline-exceeded":
    "The operation took too long to complete. Please try again.",
  "firestore/resource-exhausted":
    "We've reached our system limits. Please try again later.",
  "firestore/invalid-argument":
    "The information you provided is invalid. Please check your input and try again.",

  // Quota exhaustion errors (multiple possible formats)
  8: "Our service is temporarily experiencing high demand. Please try again in a few minutes.",
  "resource-exhausted":
    "Our service is temporarily experiencing high demand. Please try again in a few minutes.",
  RESOURCE_EXHAUSTED:
    "Our service is temporarily experiencing high demand. Please try again in a few minutes.",

  // Default error
  default:
    "Something went wrong. Please try again or contact support if the problem continues.",
};

/**
 * Maps Firebase error codes to error categories
 * @param {string} errorCode - Firebase error code
 * @returns {string} Error category
 */
export function categorizeFirebaseError(errorCode) {
  // Convert errorCode to string to handle numeric codes safely
  const errorCodeStr = String(errorCode || "");

  // Authentication errors
  if (errorCodeStr.startsWith("auth/")) {
    return ErrorCategory.AUTHENTICATION;
  }

  // Permission errors
  if (errorCode === "firestore/permission-denied") {
    return ErrorCategory.PERMISSION;
  }

  // Not found errors
  if (errorCode === "firestore/not-found") {
    return ErrorCategory.NOT_FOUND;
  }

  // Validation errors
  if (errorCode === "firestore/invalid-argument") {
    return ErrorCategory.VALIDATION;
  }

  // Network errors
  if (
    errorCodeStr === "auth/network-request-failed" ||
    errorCodeStr === "firestore/network-request-failed"
  ) {
    return ErrorCategory.NETWORK;
  }

  // Rate limit errors (but quota exhaustion should be handled separately)
  if (
    errorCodeStr === "auth/too-many-requests" ||
    errorCodeStr === "firestore/resource-exhausted" ||
    errorCodeStr === "resource-exhausted" ||
    errorCode === 8 ||
    errorCodeStr === "8" ||
    errorCodeStr.includes("RESOURCE_EXHAUSTED") ||
    errorCodeStr.includes("Quota exceeded")
  ) {
    return ErrorCategory.RATE_LIMIT;
  }

  // Service unavailable errors
  if (errorCodeStr === "firestore/unavailable") {
    return ErrorCategory.UNAVAILABLE;
  }

  // Internal errors
  if (
    errorCodeStr === "firestore/internal" ||
    errorCodeStr === "firestore/data-loss"
  ) {
    return ErrorCategory.INTERNAL;
  }

  // Unknown errors
  return ErrorCategory.UNKNOWN;
}

/**
 * Handles Firebase errors and returns user-friendly error messages
 * @param {Error} error - The Firebase error object
 * @param {number} statusCode - HTTP status code to use (default: 400)
 * @returns {AppError} - An AppError with appropriate message and status code
 */
/**
 * Gets details about a Firebase error for error handling middleware
 * @param {Error} error - The Firebase error object
 * @returns {Object} Object containing message, statusCode, and errorCode
 */
export const getFirebaseErrorDetails = (error) => {
  // Extract the error code from the Firebase error
  const errorCode = error.code || "default";

  // Convert errorCode to string to handle numeric codes (like quota exhaustion code 8)
  const errorCodeStr = String(errorCode);

  // Get the user-friendly message or use the original error message
  const message =
    firebaseErrorMessages[errorCode] ||
    error.message ||
    firebaseErrorMessages.default;

  // Determine appropriate status code based on error type
  let statusCode = 400; // Default status code

  // Handle Firebase quota exhaustion (multiple possible formats)
  if (
    errorCode === 8 ||
    errorCodeStr === "8" ||
    errorCode === "resource-exhausted" ||
    errorCodeStr === "resource-exhausted" ||
    errorCodeStr.includes("RESOURCE_EXHAUSTED") ||
    errorCodeStr.includes("Quota exceeded") ||
    error.message?.includes("Quota exceeded") ||
    error.message?.includes("resource-exhausted")
  ) {
    statusCode = 503; // Service Unavailable
  } else if (
    errorCode === "auth/user-not-found" ||
    errorCode === "auth/wrong-password" ||
    errorCode === "auth/invalid-credential"
  ) {
    statusCode = 401; // Unauthorized
  } else if (errorCode === "auth/email-already-in-use") {
    statusCode = 409; // Conflict
  } else if (errorCode === "auth/too-many-requests") {
    statusCode = 429; // Too Many Requests
  } else if (
    (typeof errorCodeStr === "string" &&
      errorCodeStr.startsWith("firestore/permission-denied")) ||
    errorCode === "auth/unauthorized-domain"
  ) {
    statusCode = 403; // Forbidden
  } else if (errorCode === "firestore/not-found") {
    statusCode = 404; // Not Found
  }

  return {
    message,
    statusCode,
    errorCode,
  };
};

export const handleFirebaseError = (error) => {
  logger.error("Firebase error:", {
    code: error.code,
    message: error.message,
    stack: config.isDevelopment ? error.stack : undefined,
  });

  // Get error details
  const {
    message,
    statusCode: responseStatusCode,
    errorCode,
  } = getFirebaseErrorDetails(error);

  // Determine error category
  const category = categorizeFirebaseError(errorCode);

  return createError(responseStatusCode, message, errorCode, category);
};
