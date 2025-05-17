/**
 * OAuth Request Validator
 * 
 * Validates OAuth requests without requiring password validation
 */

import { createError } from "./error.js";
import logger from "./logger.js";

/**
 * Validates a request with an OAuth token
 * Skips password validation
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateOAuthRequest = (req, res, next) => {
  try {
    const { idToken, email, name } = req.body;
    
    // Validate required fields
    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: {
          message: "ID token is required for OAuth authentication",
          code: "missing_token",
          status: "fail"
        }
      });
    }
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Email is required",
          code: "missing_email",
          status: "fail"
        }
      });
    }
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Name is required",
          code: "missing_name",
          status: "fail"
        }
      });
    }
    
    // If we reach here, validation passed
    next();
  } catch (error) {
    logger.error("OAuth validation error", { error });
    next(createError(400, "OAuth validation failed", "validation_error"));
  }
};
