/**
 * Application configuration
 * Centralizes all configuration settings for the application
 */

import { config as dotenvConfig } from "@dotenvx/dotenvx";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..", "..");

// Load environment variables from .env file
const envPath = join(rootDir, ".env");
try {
  if (fs.existsSync(envPath)) {
    dotenvConfig({ path: envPath });
  } else {
    console.warn(
      `No .env file found at ${envPath}. Using environment variables.`
    );
    dotenvConfig();
  }
} catch (error) {
  console.warn(`Error loading environment variables: ${error.message}`);
}

// Environment
const nodeEnv = process.env.NODE_ENV || "development";
const isDevelopment = nodeEnv === "development";
const isProduction = nodeEnv === "production";
const isTest = nodeEnv === "test";

// Server configuration
const port = parseInt(process.env.PORT || "5000", 10);
const host = process.env.HOST || "localhost";
const baseUrl = process.env.BASE_URL || `http://${host}:${port}`;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

// Firebase configuration
// Using restricted access configuration without admin privileges
const firebaseConfig = {
  // Basic configuration
  projectId: process.env.FIREBASE_PROJECT_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,

  // Client SDK configuration (for restricted access)
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  appId: process.env.FIREBASE_APP_ID,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,

  // Authentication configuration
  useEmulator: process.env.FIREBASE_USE_EMULATOR === "true",
  emulatorHost: process.env.FIREBASE_EMULATOR_HOST || "localhost",
  emulatorAuthPort: parseInt(
    process.env.FIREBASE_AUTH_EMULATOR_PORT || "9099",
    10
  ),
  emulatorFirestorePort: parseInt(
    process.env.FIREBASE_FIRESTORE_EMULATOR_PORT || "8080",
    10
  ),
};

// JWT configuration
const jwtConfig = {
  secret: process.env.JWT_SECRET || "",
  expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
};

// Arcjet configuration
const arcjetConfig = {
  apiKey: process.env.ARCJET_API_KEY,
  site: process.env.ARCJET_SITE || "mindquest",
  environment: isDevelopment ? "development" : "production",
  enableInDev: process.env.ARCJET_ENABLE_IN_DEV === "true",
  allowedEmailDomains: process.env.ALLOWED_EMAIL_DOMAINS
    ? process.env.ALLOWED_EMAIL_DOMAINS.split(",").map((domain) =>
        domain.trim()
      )
    : ["iiitkottayam.ac.in"], // Default to IIIT Kottayam domain
};

// Logging configuration
const loggingConfig = {
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  format: process.env.LOG_FORMAT || "json",
};

// Order processing configuration
const orderConfig = {
  notificationEnabled:
    process.env.ORDER_NOTIFICATION_ENABLED === "true" || false,
  adminEmail: process.env.ADMIN_EMAIL || "admin@example.com",
};

// Session configuration
const sessionConfig = {
  inactivityTimeout:
    parseInt(process.env.SESSION_INACTIVITY_TIMEOUT || "30") * 60 * 1000, // Default 30 minutes in ms
  maxAge: parseInt(process.env.SESSION_MAX_AGE || "14") * 24 * 60 * 60 * 1000, // Default 14 days in ms
  cleanupInterval:
    parseInt(process.env.SESSION_CLEANUP_INTERVAL || "60") * 60 * 1000, // Default 60 minutes in ms
};

// Security configuration
const securityConfig = {
  csrfTokenExpiry: parseInt(process.env.CSRF_TOKEN_EXPIRY || "60") * 60 * 1000, // Default 60 minutes in ms
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    imgSrc: [
      "'self'",
      "data:",
      "https://storage.googleapis.com",
      "https://*.cloudinary.com",
    ],
    connectSrc: [
      "'self'",
      "https://*.googleapis.com",
      "https://*.firebaseio.com",
    ],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'self'", "https://*.firebaseapp.com"],
  },
};

// Export configuration
const config = {
  nodeEnv,
  isDevelopment,
  isProduction,
  isTest,
  port,
  host,
  baseUrl,
  clientUrl,
  firebase: firebaseConfig,
  jwt: jwtConfig,
  arcjet: arcjetConfig,
  logging: loggingConfig,
  order: orderConfig,
  session: sessionConfig,
  security: securityConfig,
};

// Log configuration in development mode
if (isDevelopment) {
  console.log("Configuration loaded:", {
    ...config,
    firebase: {
      ...config.firebase,
      // No sensitive data to redact since we're not using private keys directly
    },
    jwt: {
      ...config.jwt,
      secret: "[REDACTED]",
    },
  });
}

export default config;
