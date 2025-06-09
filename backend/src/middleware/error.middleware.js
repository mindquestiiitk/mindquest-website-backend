/**
 * Global error handling middleware
 * Provides consistent error responses across the application
 */

import {
  getFirebaseErrorDetails,
  createErrorResponse,
} from "../utils/error.js";
import config from "../config/config.js";
import logger from "../utils/logger.js";

export const errorHandler = (err, req, res, _) => {
  // Structured logging with context
  const logContext = {
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

  // Use centralized error response creation
  const errorResponse = createErrorResponse(err);
  const statusCode = err.statusCode || errorResponse.error.status || 500;

  // Set appropriate headers
  res.setHeader("X-Error-ID", errorResponse.errorId);

  // Return the error response
  return res.status(statusCode).json(errorResponse);
};
