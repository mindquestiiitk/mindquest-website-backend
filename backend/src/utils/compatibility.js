/**
 * Compatibility utilities
 * Provides functions to maintain backward compatibility with existing frontend code
 */

import logger from "./logger.js";

/**
 * Send a response in a format compatible with the frontend
 * If the request includes a 'format' query parameter set to 'wrapped',
 * the response will be wrapped in a standard format.
 * Otherwise, the raw data will be returned for backward compatibility.
 * 
 * @param {Object} res - Express response object
 * @param {Object|Array} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} - Express response
 */
export const compatResponse = (req, res, data, message = "Success", statusCode = 200) => {
  // Check if the request wants a wrapped response
  const wantsWrappedResponse = req.query.format === 'wrapped';
  
  if (wantsWrappedResponse) {
    // Return wrapped response
    logger.debug("Sending wrapped response format");
    return res.status(statusCode).json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Return raw data for backward compatibility
  logger.debug("Sending raw response format for backward compatibility");
  return res.status(statusCode).json(data);
};

/**
 * Send a not found response
 * Always returns a wrapped error response regardless of format parameter
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
      status: "error",
    },
    timestamp: new Date().toISOString(),
  });
};
