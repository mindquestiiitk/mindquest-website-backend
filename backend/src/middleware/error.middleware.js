/**
 * Global error handling middleware
 * Provides consistent error responses across the application
 */

import { getFirebaseErrorDetails } from "../utils/error.js";
import config from "../config/config.js";
import logger from "../utils/logger.js";

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

export const errorHandler = (err, req, res, _) => {
  // Generate a unique error ID for tracking
  const errorId = generateErrorId();

  // Structured logging with context
  const logContext = {
    errorId,
    name: err.name,
    code: err.code,
    statusCode: err.statusCode || 500,
    path: req.path,
    method: req.method,
    requestId: req.requestId,
    userId: req.user?.id,
    userRole: req.user?.role,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  };

  // Log error with appropriate level based on status code
  if (err.statusCode >= 500 || !err.statusCode) {
    logger.error(`Server error: ${err.message}`, {
      ...logContext,
      stack: err.stack,
    });
  } else if (err.statusCode >= 400) {
    logger.warn(`Client error: ${err.message}`, logContext);
  }

  // Prepare the error response
  const errorResponse = {
    success: false,
    timestamp: new Date().toISOString(),
    errorId: errorId, // Include error ID for tracking
    error: {}, // Initialize error object
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

  // Sanitize error messages in production
  let errorMessage;
  if (config.isDevelopment) {
    // In development, show detailed error message
    errorMessage = err.message;
  } else {
    // In production, use user-friendly messages based on status code and context
    if (statusCode >= 500) {
      errorMessage =
        "An unexpected server error occurred. Our team has been notified and is working to fix it.";
    } else if (statusCode === 404) {
      // Provide more context for 404 errors
      if (req.path.includes("/admin")) {
        errorMessage =
          "The requested administrative resource was not found. Please check the URL or contact support.";
      } else if (req.path.includes("/api")) {
        errorMessage =
          "The requested API endpoint does not exist. Please check the documentation.";
      } else {
        errorMessage =
          "The requested resource was not found. It may have been moved or deleted.";
      }
    } else if (statusCode === 403) {
      // Provide more context for permission errors
      if (req.path.includes("/admin")) {
        errorMessage =
          "You don't have administrative privileges to access this resource. Please contact an administrator.";
      } else if (req.user) {
        errorMessage =
          "Your account doesn't have permission to access this resource. Please contact support if you believe this is an error.";
      } else {
        errorMessage =
          "You don't have permission to access this resource. Authentication may be required.";
      }
    } else if (statusCode === 401) {
      // Provide more context for authentication errors
      if (err.code === "token_expired") {
        errorMessage =
          "Your session has expired. Please log in again to continue.";
      } else if (err.code === "invalid_token") {
        errorMessage = "Your authentication is invalid. Please log in again.";
      } else {
        errorMessage =
          "Authentication is required to access this resource. Please log in.";
      }
    } else if (statusCode === 429) {
      errorMessage = "Too many requests. Please try again later.";
    } else if (statusCode === 400) {
      // Provide more context for validation errors
      if (err.name === "ValidationError") {
        errorMessage =
          "The information you provided is invalid. Please check your input and try again.";
      } else {
        errorMessage =
          "Your request couldn't be processed. Please check your input and try again.";
      }
    } else {
      errorMessage =
        "An error occurred while processing your request. Please try again or contact support.";
    }
  }

  // Sanitize error codes in production
  const errorCode = config.isDevelopment
    ? err.code || "server_error"
    : statusCode >= 500
    ? "server_error"
    : err.code || "request_error";

  errorResponse.error = {
    message: errorMessage,
    code: errorCode,
    status: "error",
  };

  // Add helpful suggestions based on error type
  if (!config.isDevelopment) {
    const suggestions = [];

    if (statusCode === 401) {
      suggestions.push("Try logging in again");
      suggestions.push("Check if your session has expired");
    } else if (statusCode === 403) {
      suggestions.push("Contact an administrator if you need access");
      suggestions.push("Check if you're using the correct account");
    } else if (statusCode === 404) {
      suggestions.push("Check the URL for typos");
      suggestions.push("The resource might have been moved or deleted");
    } else if (statusCode === 429) {
      suggestions.push("Wait a few minutes before trying again");
      suggestions.push("Reduce the frequency of your requests");
    } else if (statusCode >= 500) {
      suggestions.push("Try again later");
      suggestions.push("Contact support if the problem persists");
    }

    if (suggestions.length > 0) {
      errorResponse.error.suggestions = suggestions;
    }

    // Add support contact info for serious errors
    if (statusCode >= 500 || statusCode === 403) {
      errorResponse.error.support = {
        email: "support@mindquest.iiitkottayam.ac.in",
        errorId: errorId, // Include the error ID for reference
      };
    }
  }

  // Include stack trace and additional details only in development
  if (config.isDevelopment) {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err.details || null;

    // Include original error message if it was sanitized
    if (errorMessage !== err.message) {
      errorResponse.error.originalMessage = err.message;
    }
  }

  // Set appropriate headers
  res.setHeader("X-Error-ID", errorId);

  // Return the error response
  return res.status(statusCode).json(errorResponse);
};
