/**
 * Standardized API response utilities
 * Provides consistent response format across the application
 */

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {Object|Array} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} - Express response
 */
export const successResponse = (res, data, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Error code
 * @returns {Object} - Express response
 */
export const errorResponse = (res, message, statusCode = 400, errorCode = "bad_request") => {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: errorCode,
      status: "error",
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send a paginated response
 * @param {Object} res - Express response object
 * @param {Object|Array} data - Response data
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Success message
 * @returns {Object} - Express response
 */
export const paginatedResponse = (res, data, page, limit, total, message = "Success") => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return res.status(200).json({
    success: true,
    data,
    message,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send a created response
 * @param {Object} res - Express response object
 * @param {Object} data - Created resource data
 * @param {string} message - Success message
 * @returns {Object} - Express response
 */
export const createdResponse = (res, data, message = "Resource created successfully") => {
  return successResponse(res, data, message, 201);
};

/**
 * Send a no content response
 * @param {Object} res - Express response object
 * @returns {Object} - Express response
 */
export const noContentResponse = (res) => {
  return res.status(204).end();
};

/**
 * Send a not found response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} - Express response
 */
export const notFoundResponse = (res, message = "Resource not found") => {
  return errorResponse(res, message, 404, "not_found");
};

/**
 * Send an unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} - Express response
 */
export const unauthorizedResponse = (res, message = "Unauthorized") => {
  return errorResponse(res, message, 401, "unauthorized");
};

/**
 * Send a forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} - Express response
 */
export const forbiddenResponse = (res, message = "Forbidden") => {
  return errorResponse(res, message, 403, "forbidden");
};

/**
 * Send a validation error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} details - Validation error details
 * @returns {Object} - Express response
 */
export const validationErrorResponse = (res, message = "Validation error", details = {}) => {
  return res.status(400).json({
    success: false,
    error: {
      message,
      code: "validation_error",
      status: "error",
      details,
    },
    timestamp: new Date().toISOString(),
  });
};
