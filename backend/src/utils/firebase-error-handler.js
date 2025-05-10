/**
 * Firebase Error Handler
 * 
 * This utility provides user-friendly error messages for common Firebase authentication errors.
 * It maps Firebase error codes to descriptive messages that can be displayed to users.
 */

import { createError } from './error.js';

/**
 * Maps Firebase error codes to user-friendly error messages
 */
const errorMessages = {
  // Authentication errors
  'auth/email-already-in-use': 'This email address is already in use. Please try a different email or sign in.',
  'auth/invalid-email': 'The email address is not valid. Please check and try again.',
  'auth/user-disabled': 'This account has been disabled. Please contact support for assistance.',
  'auth/user-not-found': 'No account found with this email address. Please check your email or register.',
  'auth/wrong-password': 'Incorrect password. Please try again or reset your password.',
  'auth/invalid-credential': 'Invalid login credentials. Please check your email and password.',
  'auth/invalid-verification-code': 'Invalid verification code. Please try again.',
  'auth/invalid-verification-id': 'Invalid verification. Please request a new verification code.',
  'auth/weak-password': 'Password is too weak. Please use a stronger password with at least 6 characters.',
  'auth/requires-recent-login': 'This operation requires recent authentication. Please log in again.',
  'auth/too-many-requests': 'Too many unsuccessful login attempts. Please try again later or reset your password.',
  'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.',
  'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed before completing the sign-in process. Please try again.',
  'auth/unauthorized-domain': 'This domain is not authorized for OAuth operations. Please contact support.',
  'auth/expired-action-code': 'This action code has expired. Please request a new one.',
  'auth/invalid-action-code': 'The action code is invalid. Please request a new one.',
  'auth/quota-exceeded': 'Quota exceeded. Please try again later.',
  'auth/missing-verification-code': 'Missing verification code. Please try again.',
  'auth/invalid-phone-number': 'The phone number is invalid. Please enter a valid phone number.',
  'auth/captcha-check-failed': 'reCAPTCHA verification failed. Please try again.',
  'auth/missing-phone-number': 'Please provide a phone number.',
  'auth/invalid-recipient-email': 'The email address is invalid. Please check the email address.',
  'auth/invalid-sender': 'Invalid sender. Please contact support.',
  'auth/missing-continue-uri': 'A continue URL must be provided. Please contact support.',
  'auth/missing-iframe-start': 'An internal error has occurred. Please contact support.',
  'auth/missing-android-pkg-name': 'An Android package name must be provided. Please contact support.',
  'auth/missing-app-credential': 'Missing app credential. Please contact support.',
  'auth/invalid-oauth-client-id': 'The OAuth client ID is invalid. Please contact support.',
  'auth/invalid-oauth-provider': 'The OAuth provider is invalid. Please contact support.',
  'auth/invalid-continue-uri': 'The continue URL is invalid. Please contact support.',
  'auth/unauthorized-continue-uri': 'The domain of the continue URL is not whitelisted. Please contact support.',
  'auth/missing-oauth-client-secret': 'The OAuth client secret is required. Please contact support.',
  'auth/session-expired': 'Your session has expired. Please sign in again.',
  'auth/id-token-expired': 'Your login session has expired. Please sign in again.',
  'auth/id-token-revoked': 'Your login token has been revoked. Please sign in again.',
  
  // Firestore errors
  'firestore/permission-denied': 'You do not have permission to perform this operation.',
  'firestore/not-found': 'The requested document was not found.',
  'firestore/already-exists': 'The document already exists.',
  'firestore/failed-precondition': 'Operation was rejected because the system is not in a state required for the operation.',
  'firestore/aborted': 'The operation was aborted, typically due to a concurrency issue.',
  'firestore/out-of-range': 'Operation was attempted past the valid range.',
  'firestore/unavailable': 'The service is currently unavailable. Please try again later.',
  'firestore/data-loss': 'Unrecoverable data loss or corruption.',
  'firestore/unauthenticated': 'The request does not have valid authentication credentials.',
  'firestore/cancelled': 'The operation was cancelled.',
  'firestore/unknown': 'Unknown error occurred.',
  'firestore/deadline-exceeded': 'Deadline expired before operation could complete.',
  'firestore/resource-exhausted': 'Some resource has been exhausted.',
  
  // Default error
  'default': 'An error occurred. Please try again later.'
};

/**
 * Handles Firebase errors and returns user-friendly error messages
 * @param {Error} error - The Firebase error object
 * @param {number} statusCode - HTTP status code to use (default: 400)
 * @returns {AppError} - An AppError with appropriate message and status code
 */
export const handleFirebaseError = (error, statusCode = 400) => {
  console.error('Firebase error:', error);
  
  // Extract the error code from the Firebase error
  const errorCode = error.code || 'default';
  
  // Get the user-friendly message or use the original error message
  const errorMessage = errorMessages[errorCode] || error.message || errorMessages.default;
  
  // Determine appropriate status code based on error type
  let responseStatusCode = statusCode;
  if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || 
      errorCode === 'auth/invalid-credential') {
    responseStatusCode = 401; // Unauthorized
  } else if (errorCode === 'auth/email-already-in-use') {
    responseStatusCode = 409; // Conflict
  } else if (errorCode === 'auth/too-many-requests') {
    responseStatusCode = 429; // Too Many Requests
  } else if (errorCode.startsWith('firestore/permission-denied') || 
             errorCode === 'auth/unauthorized-domain') {
    responseStatusCode = 403; // Forbidden
  } else if (errorCode === 'firestore/not-found') {
    responseStatusCode = 404; // Not Found
  }
  
  return createError(responseStatusCode, errorMessage);
};

/**
 * Creates a standardized error response object
 * @param {Error} error - The error object
 * @returns {Object} - Standardized error response
 */
export const createErrorResponse = (error) => {
  return {
    success: false,
    error: {
      message: error.message,
      code: error.code || 'unknown_error',
      status: error.statusCode || 500
    }
  };
};
