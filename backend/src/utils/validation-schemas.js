/**
 * Validation Schemas
 * 
 * Centralized validation schemas for request validation
 * Production-ready with comprehensive validation rules
 */

// Password validation regex
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[a-zA-Z0-9\s\-'_.]{2,50}$/;
const UID_REGEX = /^[a-zA-Z0-9]{28}$/;
const TOKEN_REGEX = /^[a-zA-Z0-9_-]{20,}$/;

// Common validation messages
const VALIDATION_MESSAGES = {
  required: (field) => `${field} is required`,
  email: 'Please enter a valid email address',
  password: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
  name: 'Name must be between 2-50 characters and contain only letters, numbers, spaces, hyphens, apostrophes, underscores, and periods',
  uid: 'Invalid user ID format',
  token: 'Invalid token format',
  min: (field, length) => `${field} must be at least ${length} characters`,
  max: (field, length) => `${field} must be at most ${length} characters`,
};

/**
 * Validation schemas for all API endpoints
 */
export const schemas = {
  auth: {
    register: {
      email: { 
        type: 'string', 
        required: true, 
        regex: EMAIL_REGEX,
        message: VALIDATION_MESSAGES.email,
        maxLength: 255,
      },
      password: { 
        type: 'string', 
        required: true, 
        regex: PASSWORD_REGEX,
        message: VALIDATION_MESSAGES.password,
        minLength: 8,
        maxLength: 100,
      },
      name: { 
        type: 'string', 
        required: true,
        regex: NAME_REGEX,
        message: VALIDATION_MESSAGES.name,
        minLength: 2,
        maxLength: 50,
      },
      avatarId: { 
        type: 'string',
        required: false,
        maxLength: 100,
      },
    },
    
    login: {
      email: { 
        type: 'string', 
        required: true, 
        regex: EMAIL_REGEX,
        message: VALIDATION_MESSAGES.email,
        maxLength: 255,
      },
      password: { 
        type: 'string', 
        required: true,
        minLength: 8,
        maxLength: 100,
      },
      rememberMe: {
        type: 'boolean',
        required: false,
      },
    },
    
    forgotPassword: {
      email: { 
        type: 'string', 
        required: true, 
        regex: EMAIL_REGEX,
        message: VALIDATION_MESSAGES.email,
        maxLength: 255,
      },
    },
    
    resetPassword: {
      token: { 
        type: 'string', 
        required: true,
        regex: TOKEN_REGEX,
        message: VALIDATION_MESSAGES.token,
      },
      password: { 
        type: 'string', 
        required: true, 
        regex: PASSWORD_REGEX,
        message: VALIDATION_MESSAGES.password,
        minLength: 8,
        maxLength: 100,
      },
    },
    
    changePassword: {
      currentPassword: { 
        type: 'string', 
        required: true,
        minLength: 8,
        maxLength: 100,
      },
      newPassword: { 
        type: 'string', 
        required: true, 
        regex: PASSWORD_REGEX,
        message: VALIDATION_MESSAGES.password,
        minLength: 8,
        maxLength: 100,
      },
    },
    
    updateProfile: {
      name: { 
        type: 'string', 
        required: false,
        regex: NAME_REGEX,
        message: VALIDATION_MESSAGES.name,
        minLength: 2,
        maxLength: 50,
      },
      avatarId: { 
        type: 'string',
        required: false,
        maxLength: 100,
      },
      email: { 
        type: 'string', 
        required: false, 
        regex: EMAIL_REGEX,
        message: VALIDATION_MESSAGES.email,
        maxLength: 255,
      },
    },
    
    updateRole: {
      role: { 
        type: 'string', 
        required: true,
        enum: ['user', 'admin', 'moderator', 'counselor'],
        message: 'Invalid role. Must be one of: user, admin, moderator, counselor',
      },
    },
    
    verifyEmail: {
      code: { 
        type: 'string', 
        required: true,
        regex: TOKEN_REGEX,
        message: VALIDATION_MESSAGES.token,
      },
    },
    
    deleteAccount: {
      password: { 
        type: 'string', 
        required: true,
        minLength: 8,
        maxLength: 100,
      },
      reason: {
        type: 'string',
        required: false,
        maxLength: 500,
      },
    },
  },
  
  events: {
    create: {
      title: { 
        type: 'string', 
        required: true,
        minLength: 3,
        maxLength: 100,
      },
      description: { 
        type: 'string', 
        required: true,
        minLength: 10,
        maxLength: 2000,
      },
      date: { 
        type: 'string', 
        required: true,
        regex: /^\d{4}-\d{2}-\d{2}$/,
        message: 'Date must be in YYYY-MM-DD format',
      },
      location: { 
        type: 'string', 
        required: true,
        minLength: 3,
        maxLength: 100,
      },
      category: { 
        type: 'string', 
        required: true,
        enum: ['workshop', 'seminar', 'conference', 'meetup', 'other'],
        message: 'Invalid category. Must be one of: workshop, seminar, conference, meetup, other',
      },
      capacity: { 
        type: 'number', 
        required: false,
        min: 1,
        max: 1000,
      },
      images: { 
        type: 'array', 
        required: false,
        maxLength: 10,
      },
    },
    
    update: {
      title: { 
        type: 'string', 
        required: false,
        minLength: 3,
        maxLength: 100,
      },
      description: { 
        type: 'string', 
        required: false,
        minLength: 10,
        maxLength: 2000,
      },
      date: { 
        type: 'string', 
        required: false,
        regex: /^\d{4}-\d{2}-\d{2}$/,
        message: 'Date must be in YYYY-MM-DD format',
      },
      location: { 
        type: 'string', 
        required: false,
        minLength: 3,
        maxLength: 100,
      },
      category: { 
        type: 'string', 
        required: false,
        enum: ['workshop', 'seminar', 'conference', 'meetup', 'other'],
        message: 'Invalid category. Must be one of: workshop, seminar, conference, meetup, other',
      },
      capacity: { 
        type: 'number', 
        required: false,
        min: 1,
        max: 1000,
      },
      images: { 
        type: 'array', 
        required: false,
        maxLength: 10,
      },
    },
  },
  
  // Add more schemas for other endpoints as needed
};

/**
 * Validate data against a schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} - Validation result with isValid and errors
 */
export const validateData = (data, schema) => {
  const errors = [];
  
  // Check each field in the schema
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        message: rules.message || VALIDATION_MESSAGES.required(field),
      });
      continue; // Skip other validations for this field
    }
    
    // Skip validation if value is not provided and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }
    
    // Check type
    if (rules.type && typeof value !== rules.type) {
      errors.push({
        field,
        message: `${field} must be of type ${rules.type}`,
      });
    }
    
    // Check min length for strings
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      errors.push({
        field,
        message: rules.message || VALIDATION_MESSAGES.min(field, rules.minLength),
      });
    }
    
    // Check max length for strings
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      errors.push({
        field,
        message: rules.message || VALIDATION_MESSAGES.max(field, rules.maxLength),
      });
    }
    
    // Check regex pattern
    if (rules.regex && typeof value === 'string' && !rules.regex.test(value)) {
      errors.push({
        field,
        message: rules.message || `${field} has an invalid format`,
      });
    }
    
    // Check enum values
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push({
        field,
        message: rules.message || `${field} must be one of: ${rules.enum.join(', ')}`,
      });
    }
    
    // Check min value for numbers
    if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
      errors.push({
        field,
        message: `${field} must be at least ${rules.min}`,
      });
    }
    
    // Check max value for numbers
    if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
      errors.push({
        field,
        message: `${field} must be at most ${rules.max}`,
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};
