/**
 * Centralized CORS Configuration
 *
 * This file provides a single source of truth for CORS settings across the application.
 * It exports a function that creates a consistent CORS configuration based on the app config.
 */

import config from "./config.js";

/**
 * Get the list of allowed origins based on the application configuration
 * @returns {string[]} Array of allowed origin URLs
 */
export const getAllowedOrigins = () => {
  return [
    config.clientUrl, // Primary client URL from environment (http://localhost:5173)
    config.baseUrl, // Backend URL for same-origin requests (http://localhost:3000)
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
export const getAllowedHeaders = () => {
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
export const getExposedHeaders = () => {
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
export const createOriginCallback = () => {
  const allowedOrigins = getAllowedOrigins();

  return (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) {
      return callback(null, true);
    }

    // In development mode, allow all origins
    if (allowedOrigins.includes(origin) || config.isDevelopment) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  };
};

/**
 * Create a complete CORS configuration object for Express
 * @returns {Object} CORS configuration object
 */
export const createCorsConfig = () => {
  return {
    origin: createOriginCallback(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: getAllowedHeaders(),
    exposedHeaders: getExposedHeaders(),
    maxAge: 86400, // 24 hours
  };
};

/**
 * Create a CORS configuration object for Socket.IO
 * @returns {Object} Socket.IO CORS configuration object
 */
export const createSocketCorsConfig = () => {
  return {
    origin: createOriginCallback(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: getAllowedHeaders(),
  };
};

// Export the allowed origins array directly for use in places that need it
export const allowedOrigins = getAllowedOrigins();
