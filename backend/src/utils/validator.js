/**
 * Request validation utilities
 * Provides consistent validation across the application
 */

import { AppError } from "./error.js";
import logger from "./logger.js";

/**
 * Validate request data against a schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Validation schema
 * @throws {AppError} - Throws an error if validation fails
 */
export const validateData = (data, schema) => {
  // Check required fields
  for (const [field, rules] of Object.entries(schema)) {
    if (rules.required && (data[field] === undefined || data[field] === null || data[field] === "")) {
      throw new AppError(400, `${field} is required`, "validation_error");
    }
    
    if (data[field] !== undefined && data[field] !== null) {
      // Check type
      if (rules.type && typeof data[field] !== rules.type) {
        throw new AppError(400, `${field} must be a ${rules.type}`, "validation_error");
      }
      
      // Check string length
      if (rules.type === "string") {
        if (rules.min && data[field].length < rules.min) {
          throw new AppError(400, `${field} must be at least ${rules.min} characters`, "validation_error");
        }
        
        if (rules.max && data[field].length > rules.max) {
          throw new AppError(400, `${field} must be at most ${rules.max} characters`, "validation_error");
        }
      }
      
      // Check number range
      if (rules.type === "number") {
        if (rules.min !== undefined && data[field] < rules.min) {
          throw new AppError(400, `${field} must be at least ${rules.min}`, "validation_error");
        }
        
        if (rules.max !== undefined && data[field] > rules.max) {
          throw new AppError(400, `${field} must be at most ${rules.max}`, "validation_error");
        }
      }
      
      // Check email format
      if (rules.format === "email" && !isValidEmail(data[field])) {
        throw new AppError(400, `${field} must be a valid email address`, "validation_error");
      }
    }
  }
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether the email is valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate request middleware
 * @param {Object} schema - Validation schema
 * @returns {Function} - Express middleware
 */
export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      validateData(req.body, schema);
      next();
    } catch (error) {
      logger.warn("Validation error", { 
        path: req.path, 
        body: req.body, 
        error: error.message 
      });
      next(error);
    }
  };
};

/**
 * Common validation schemas
 */
export const schemas = {
  auth: {
    register: {
      email: { type: "string", required: true, format: "email" },
      password: { type: "string", required: true, min: 6 },
      name: { type: "string", required: true },
      avatarId: { type: "string" },
    },
    
    login: {
      email: { type: "string", required: true, format: "email" },
      password: { type: "string", required: true },
    },
    
    forgotPassword: {
      email: { type: "string", required: true, format: "email" },
    },
    
    resetPassword: {
      token: { type: "string", required: true },
      password: { type: "string", required: true, min: 6 },
    },
    
    changePassword: {
      currentPassword: { type: "string", required: true },
      newPassword: { type: "string", required: true, min: 6 },
    },
  },
  
  user: {
    updateProfile: {
      name: { type: "string" },
      avatarId: { type: "string" },
    },
  },
};
