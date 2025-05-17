import { createError } from "./error.js";
import config from "../config/config.js";

export const validateRequest = (req, schema) => {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = req.body[field];

    // Check required fields
    if (
      rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      // Use more user-friendly error messages
      const fieldName =
        field.charAt(0).toUpperCase() +
        field
          .slice(1)
          .replace(/([A-Z])/g, " $1")
          .trim();
      errors.push(`${fieldName} is required. Please provide a valid ${field}.`);
      continue;
    }

    // Skip other validations if value is not provided and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Check type
    if (rules.type && typeof value !== rules.type) {
      errors.push(`${field} must be of type ${rules.type}`);
    }

    // Check minimum length for strings
    if (rules.type === "string" && rules.min && value.length < rules.min) {
      errors.push(`${field} must be at least ${rules.min} characters long`);
    }

    // Check maximum length for strings
    if (rules.type === "string" && rules.max && value.length > rules.max) {
      errors.push(`${field} must be at most ${rules.max} characters long`);
    }

    // Check minimum value for numbers
    if (
      rules.type === "number" &&
      rules.min !== undefined &&
      value < rules.min
    ) {
      errors.push(`${field} must be at least ${rules.min}`);
    }

    // Check maximum value for numbers
    if (
      rules.type === "number" &&
      rules.max !== undefined &&
      value > rules.max
    ) {
      errors.push(`${field} must be at most ${rules.max}`);
    }

    // Check email format
    if (rules.type === "string" && rules.email && !isValidEmail(value)) {
      errors.push(`${field} must be a valid email address`);
    }

    // Check email domain if specified
    if (
      rules.type === "string" &&
      rules.emailDomain &&
      !isValidEmailDomain(value)
    ) {
      const allowedDomains = config.arcjet.allowedEmailDomains.join(", ");
      errors.push(
        `${field} must use an authorized email domain (${allowedDomains})`
      );
    }
  }

  if (errors.length > 0) {
    throw createError(400, errors.join(", "));
  }
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidEmailDomain = (email) => {
  if (!isValidEmail(email)) return false;

  const domain = email.split("@")[1].toLowerCase();
  return config.arcjet.allowedEmailDomains.includes(domain);
};

/**
 * Validates a password
 * @param {string} password - Password to validate
 * @param {string} provider - Authentication provider (e.g., 'password', 'google')
 * @returns {Object} - Validation result with isValid flag and error message
 */
export const validatePassword = (password, provider = 'password') => {
  // Skip password validation for OAuth providers (google, apple, facebook, etc.)
  if (provider !== 'password') {
    return {
      isValid: true,
      message: "Password validation skipped for OAuth provider",
    };
  }

  // Password must be at least 8 characters
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long",
    };
  }

  // Password must contain at least one uppercase letter
  const hasUppercase = /[A-Z]/.test(password);
  if (!hasUppercase) {
    return {
      isValid: false,
      message: "Password must include at least one uppercase letter",
    };
  }

  // Password must contain at least one lowercase letter
  const hasLowercase = /[a-z]/.test(password);
  if (!hasLowercase) {
    return {
      isValid: false,
      message: "Password must include at least one lowercase letter",
    };
  }

  // Password must contain at least one number
  const hasNumber = /[0-9]/.test(password);
  if (!hasNumber) {
    return {
      isValid: false,
      message: "Password must include at least one number",
    };
  }

  // Password must contain at least one special character
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (!hasSpecial) {
    return {
      isValid: false,
      message: "Password must include at least one special character",
    };
  }

  return {
    isValid: true,
    message: "Password is valid",
  };
};
