/**
 * Centralized CORS Configuration for Firebase Cloud Functions
 *
 * This file provides a CommonJS version of the CORS configuration for use in Firebase Cloud Functions.
 */

// Get client URL from environment or use default
const clientUrl =
  process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";
const baseUrl =
  process.env.BACKEND_URL || process.env.BASE_URL || "http://localhost:3000";

/**
 * Get the list of allowed origins based on the application configuration
 * @returns {string[]} Array of allowed origin URLs
 */
const getAllowedOrigins = () => {
  return [
    clientUrl, // Primary client URL from environment (http://localhost:5173)
    baseUrl, // Backend URL for same-origin requests (http://localhost:3000)
    // Development URLs
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174", // Frontend is running on port 5174
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174", // Frontend is running on port 5174
  ];
};

/**
 * Get the list of allowed headers for CORS requests
 * @returns {string[]} Array of allowed header names
 */
const getAllowedHeaders = () => {
  return [
    "Content-Type",
    "Authorization",
    "x-request-id",
    "x-token-expiring-soon",
    "x-token-expires-in",
    "x-csrf-token",
    "x-requested-with",
    "accept",
    "origin",
    "cache-control",
    "x-api-key",
    "x-request-timestamp",
    "x-client-version",
    "cookie",
    "set-cookie",
  ];
};

/**
 * Get the list of exposed headers for CORS responses
 * @returns {string[]} Array of exposed header names
 */
const getExposedHeaders = () => {
  return [
    "x-request-id",
    "x-token-expiring-soon",
    "x-token-expires-in",
    "x-request-timestamp",
    "set-cookie",
  ];
};

/**
 * Create a CORS origin callback function that handles origin validation
 * @returns {Function} Origin callback function for CORS middleware
 */
const createOriginCallback = () => {
  const allowedOrigins = getAllowedOrigins();

  return (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) {
      return callback(null, true);
    }

    // In development mode, allow all origins
    if (
      allowedOrigins.includes(origin) ||
      process.env.NODE_ENV === "development"
    ) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  };
};

/**
 * Create a complete CORS configuration object
 * @returns {Object} CORS configuration object
 */
const createCorsConfig = () => {
  return {
    origin: createOriginCallback(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: getAllowedHeaders(),
    exposedHeaders: getExposedHeaders(),
    maxAge: 86400, // 24 hours
  };
};

// Export the allowed origins array directly for use in places that need it
const allowedOrigins = getAllowedOrigins();

module.exports = {
  getAllowedOrigins,
  getAllowedHeaders,
  getExposedHeaders,
  createOriginCallback,
  createCorsConfig,
  allowedOrigins,
};
