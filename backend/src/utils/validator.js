/**
 * Request Validation Middleware
 *
 * Production-ready validation middleware that:
 * - Validates request data against schemas
 * - Provides detailed error messages
 * - Logs validation failures for monitoring
 * - Sanitizes inputs to prevent injection attacks
 */

import { AppError, ErrorCategory } from "./error.js";
import logger from "./logger.js";
import { validateData } from "./validation-schemas.js";

/**
 * Validate and sanitize request data
 * @param {Object} data - Request data to validate
 * @param {Object} schema - Validation schema
 * @throws {AppError} - Throws an error if validation fails
 */
export const validateAndSanitize = (data, schema) => {
  // Validate data against schema
  const validation = validateData(data, schema);

  if (!validation.isValid) {
    // Format validation errors
    const errorMessages = validation.errors
      .map((err) => err.message)
      .join("; ");
    const errorDetails = validation.errors.reduce((acc, err) => {
      acc[err.field] = err.message;
      return acc;
    }, {});

    // Create validation error
    const error = new AppError(
      400,
      `Validation failed: ${errorMessages}`,
      "validation_error",
      ErrorCategory.VALIDATION
    );

    // Add error details
    error.details = errorDetails;

    throw error;
  }

  // Sanitize string inputs to prevent XSS
  const sanitizedData = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      // Sanitize HTML content in strings
      sanitizedData[key] = sanitizeHtml(value);
    } else {
      sanitizedData[key] = value;
    }
  }

  return sanitizedData;
};

/**
 * Production-ready HTML sanitization utility
 * Uses a comprehensive approach to prevent XSS attacks
 * @param {string} html - HTML string to sanitize
 * @returns {string} - Sanitized string
 */
export const sanitizeHtml = (html) => {
  if (!html) return html;

  // For production, we use a comprehensive sanitization approach
  return (
    html
      // Replace HTML special chars with entities
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      // Remove potential script injections
      .replace(/javascript:/gi, "")
      .replace(/on\w+=/gi, "")
      .replace(/data:/gi, "")
      // Remove potential CSS injections
      .replace(/expression\(/gi, "")
      .replace(/url\(/gi, "")
      // Remove other potentially dangerous patterns
      .replace(/eval\(/gi, "")
      .replace(/Function\(/gi, "")
  );
};

/**
 * Validate request middleware
 * @param {Object} schema - Validation schema
 * @returns {Function} - Express middleware
 */
export const validateRequest = (schema) => {
  return (req, _res, next) => {
    try {
      // Validate and sanitize request body
      const sanitizedData = validateAndSanitize(req.body, schema);

      // Replace request body with sanitized data
      req.body = sanitizedData;

      // Add validation timestamp for debugging
      req.validatedAt = new Date().toISOString();

      next();
    } catch (error) {
      // Log validation errors
      logger.warn("Validation error", {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        requestId: req.requestId,
        body: req.body,
        error: error.message,
        details: error.details,
      });

      next(error);
    }
  };
};
