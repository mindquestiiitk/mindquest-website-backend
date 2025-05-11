/**
 * Centralized configuration for the application
 * Loads environment variables and provides a single source of truth for all configuration
 */

import { config } from "@dotenvx/dotenvx";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, "../../.env") });

export default {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV !== "production",
  
  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? undefined : "dev-secret"),
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  
  // CORS
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    exposedHeaders: ["Set-Cookie"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  },
  
  // Arcjet
  arcjet: {
    key: process.env.ARCJET_SECRET,
    site: "mindquest",
    enabled: process.env.NODE_ENV === "production",
  },
  
  // Email
  email: {
    allowedDomains: ["iiitkottayam.ac.in"],
    validateInProduction: true,
  },
};
