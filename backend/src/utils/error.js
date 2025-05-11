/**
 * Centralized error handling utilities
 * Provides consistent error handling across the application
 */

/**
 * Custom error class for operational errors
 * These are errors that we expect to happen and can handle gracefully
 */
export class AppError extends Error {
  constructor(statusCode, message, errorCode = "unknown_error") {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Helper function to create errors with consistent format
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} errorCode - Error code for client identification
 * @returns {AppError} - Formatted error object
 */
export const createError = (statusCode, message, errorCode) => {
  return new AppError(statusCode, message, errorCode);
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
 * Get Firebase error details
 * @param {Error} error - Firebase error
 * @returns {Object} - Formatted error details
 */
export const getFirebaseErrorDetails = (error) => {
  // Firebase Auth errors
  if (error.code?.startsWith("auth/")) {
    const errorMap = {
      "auth/email-already-in-use": {
        message:
          "This email address is already in use. Please try a different email or sign in.",
        statusCode: 409,
        errorCode: "email_already_exists",
      },
      "auth/invalid-email": {
        message:
          "The email address is invalid. Please check your email and try again.",
        statusCode: 400,
        errorCode: "invalid_email",
      },
      "auth/user-not-found": {
        message:
          "No account found with this email address. Please check your email or register.",
        statusCode: 404,
        errorCode: "user_not_found",
      },
      "auth/wrong-password": {
        message: "Incorrect password. Please try again or reset your password.",
        statusCode: 401,
        errorCode: "invalid_credentials",
      },
      "auth/weak-password": {
        message: "Password is too weak. Please use a stronger password.",
        statusCode: 400,
        errorCode: "weak_password",
      },
      "auth/invalid-credential": {
        message: "Invalid credentials. Please check your email and password.",
        statusCode: 401,
        errorCode: "invalid_credentials",
      },
    };

    const errorDetails = errorMap[error.code] || {
      message: error.message || "Authentication error",
      statusCode: 400,
      errorCode: error.code,
    };

    return errorDetails;
  }

  // Firestore errors
  if (error.code?.startsWith("firestore/")) {
    return {
      message: error.message || "Database error",
      statusCode: 500,
      errorCode: error.code,
    };
  }

  // Default error
  return {
    message: error.message || "Something went wrong",
    statusCode: error.statusCode || 500,
    errorCode: error.code || "server_error",
  };
};

/**
 * Handle Firebase errors
 * @param {Error} error - Firebase error
 * @returns {AppError} - Formatted error object
 */
export const handleFirebaseError = (error) => {
  const { message, statusCode, errorCode } = getFirebaseErrorDetails(error);
  return new AppError(statusCode, message, errorCode);
};
