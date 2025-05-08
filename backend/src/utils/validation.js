import { createError } from "./error.js";

export const validateRequest = (req, schema) => {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = req.body[field];

    // Check required fields
    if (
      rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push(`${field} is required`);
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
  }

  if (errors.length > 0) {
    throw createError(400, errors.join(", "));
  }
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
