/**
 * Response utilities
 * Provides standardized response formatting for the API
 */

import logger from "./logger.js";

/**
 * Send a standardized response
 * Always returns data in the current standardized format
 *
 * @param {Object} res - Express response object
 * @param {Object|Array} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} - Express response
 */
export const compatResponse = (
  _req,
  res,
  data,
  message = "Success",
  statusCode = 200
) => {
  // Always use the standardized response format
  logger.debug("Sending standardized response format");
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send a standardized not found response
 *
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} - Express response
 */
export const compatNotFound = (res, message = "Resource not found") => {
  return res.status(404).json({
    success: false,
    error: {
      message,
      code: "not_found",
      category: "not_found",
    },
    timestamp: new Date().toISOString(),
  });
};
