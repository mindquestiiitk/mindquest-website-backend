/**
 * Global error handling middleware
 * Provides consistent error responses across the application
 */
import config from "../config/config.js";
import { getFirebaseErrorDetails } from "../utils/error.js";

export const errorHandler = (err, req, res, next) => {
  // Log error details in development
  if (config.isDevelopment) {
    console.error("\x1b[31m%s\x1b[0m", "ERROR STACK:", err.stack);
    console.error("\x1b[33m%s\x1b[0m", "ERROR DETAILS:", {
      name: err.name,
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });
  } else {
    // In production, log minimal details
    console.error(
      `Error: ${err.message} | ${req.method} ${req.path} | ${
        err.statusCode || 500
      }`
    );
  }

  // Prepare the error response
  const errorResponse = {
    success: false,
    timestamp: new Date().toISOString(),
  };

  // Handle AppError (operational errors)
  if (err.isOperational) {
    const statusCode = err.statusCode || 400;
    errorResponse.error = {
      message: err.message,
      code: err.errorCode || "unknown_error",
      status: err.status || "error",
    };

    return res.status(statusCode).json(errorResponse);
  }

  // Handle Arcjet errors
  if (err.name && err.name.startsWith("Arcjet")) {
    const arcjetErrorMap = {
      ArcjetError: { status: 400, code: "validation_error" },
      ArcjetRateLimitError: { status: 429, code: "rate_limit_exceeded" },
      ArcjetSecurityError: { status: 403, code: "security_violation" },
      ArcjetEmailValidationError: { status: 403, code: "invalid_email_domain" },
      ArcjetBotError: { status: 403, code: "bot_detected" },
      ArcjetDDoSError: { status: 429, code: "ddos_protection" },
      ArcjetWAFError: { status: 403, code: "waf_blocked" },
    };

    const errorInfo = arcjetErrorMap[err.name] || {
      status: 400,
      code: "security_error",
    };

    errorResponse.error = {
      message: err.message || "Request blocked by security rules",
      code: errorInfo.code,
      status: "error",
    };

    if (err.details) {
      errorResponse.error.details = err.details;
    }

    if (err.retryAfter) {
      errorResponse.error.retryAfter = err.retryAfter;
    }

    return res.status(errorInfo.status).json(errorResponse);
  }

  // Handle authentication errors
  if (err.name === "UnauthorizedError" || err.name === "JsonWebTokenError") {
    errorResponse.error = {
      message: "Invalid authentication token",
      code: "invalid_token",
      status: "error",
    };

    return res.status(401).json(errorResponse);
  }

  if (err.name === "TokenExpiredError") {
    errorResponse.error = {
      message: "Authentication token has expired",
      code: "token_expired",
      status: "error",
    };

    return res.status(401).json(errorResponse);
  }

  if (err.name === "ForbiddenError") {
    errorResponse.error = {
      message: "You do not have permission to perform this action",
      code: "forbidden",
      status: "error",
    };

    return res.status(403).json(errorResponse);
  }

  // Handle Firebase errors
  if (
    err.code &&
    (err.code.startsWith("auth/") || err.code.startsWith("firestore/"))
  ) {
    const { message, statusCode, errorCode } = getFirebaseErrorDetails(err);

    errorResponse.error = {
      message,
      code: errorCode,
      status: "error",
    };

    return res.status(statusCode).json(errorResponse);
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    errorResponse.error = {
      message: err.message,
      code: "validation_error",
      status: "error",
      details: err.details,
    };

    return res.status(400).json(errorResponse);
  }

  // Default error response for unexpected errors
  const statusCode = err.statusCode || 500;

  errorResponse.error = {
    message: config.isDevelopment
      ? err.message
      : "An unexpected error occurred. Please try again later.",
    code: err.code || "server_error",
    status: "error",
  };

  // Include stack trace in development
  if (config.isDevelopment) {
    errorResponse.error.stack = err.stack;
  }

  return res.status(statusCode).json(errorResponse);
};
