/**
 * Validation Schemas for OAuth registration
 */

export const oauthSchemas = {
  // Schema for OAuth registration that doesn't require password
  register: {
    email: { 
      type: 'string', 
      required: true, 
      regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
      maxLength: 255,
    },
    name: { 
      type: 'string', 
      required: true,
      regex: /^[a-zA-Z0-9\s\-'_.]{2,50}$/,
      message: 'Name must be between 2-50 characters and contain only letters, numbers, spaces, hyphens, apostrophes, underscores, and periods',
      minLength: 2,
      maxLength: 50,
    },
    idToken: {
      type: 'string',
      required: true,
      message: 'Valid ID token is required for OAuth registration',
    },
    provider: {
      type: 'string',
      required: false,
    },
    emailVerified: {
      type: 'boolean',
      required: false,
    },
    avatarId: { 
      type: 'string',
      required: false,
      maxLength: 100,
    },
  }
};
