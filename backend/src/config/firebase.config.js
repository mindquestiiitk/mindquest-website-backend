/**
 * Unified Firebase Configuration
 *
 * This module provides a single source of truth for all Firebase configuration,
 * including both Admin SDK and Client SDK instances.
 *
 * Production-ready configuration with secure credential handling.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { initializeApp as initializeClientApp } from "firebase/app";
import { getAuth as getClientAuth } from "firebase/auth";
import { getFirestore as getClientFirestore } from "firebase/firestore";
import { getStorage as getClientStorage } from "firebase/storage";
import logger from "../utils/logger.js";
import config from "./config.js";

// Firebase configuration object
const firebaseConfig = {
  // Basic configuration
  projectId: config.firebase.projectId,
  databaseURL: config.firebase.databaseURL,
  storageBucket: config.firebase.storageBucket,

  // Client SDK configuration
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  appId: process.env.FIREBASE_APP_ID,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase Admin SDK
let adminApp, adminAuth, adminDb;

// Initialize Firebase Client SDK
let clientApp, clientAuth, clientDb, clientStorage;

// Initialize Firebase Admin SDK
try {
  logger.info("Initializing Firebase Admin SDK");

  if (!firebaseConfig.projectId) {
    throw new Error(
      "Missing Firebase project ID. Check environment variables."
    );
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    (process.env.FIREBASE_PRIVATE_KEY ||
      process.env.FIREBASE_PRIVATE_KEY_BASE64) &&
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // Replace escaped newlines with actual newlines
    privateKey = privateKey?.replace(/\\n/g, "\n");

    logger.info(
      `Using environment variables for Firebase Admin SDK credentials`
    );

    // Initialize with environment variables
    adminApp = initializeApp(
      {
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        databaseURL: firebaseConfig.databaseURL,
        storageBucket: firebaseConfig.storageBucket,
      },
      "admin"
    );
  } else {
    // For production, we must have proper credentials
    logger.error("No Firebase Admin credentials found in environment");
    throw new Error(
      "Firebase Admin SDK credentials are required. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables."
    );
  }

  adminAuth = getAdminAuth(adminApp);
  adminDb = getAdminFirestore(adminApp);

  // Configure Firestore
  adminDb.settings({
    ignoreUndefinedProperties: true,
  });

  logger.info("Firebase Admin SDK initialized successfully", {
    projectId: firebaseConfig.projectId,
  });
} catch (error) {
  logger.error("Firebase Admin SDK initialization error", {
    error: error.message,
    stack: error.stack,
  });
  g;
  throw error;
}

// Initialize Firebase Client SDK
try {
  logger.info("Initializing Firebase Client SDK");

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    logger.warn(
      "Missing Firebase client configuration. Some features may not work properly."
    );
  }

  clientApp = initializeClientApp(firebaseConfig, "client");
  clientAuth = getClientAuth(clientApp);
  clientDb = getClientFirestore(clientApp);
  clientStorage = getClientStorage(clientApp);

  logger.info("Firebase Client SDK initialized successfully", {
    projectId: firebaseConfig.projectId,
  });
} catch (error) {
  logger.error("Firebase Client SDK initialization error", {
    error: error.message,
    stack: error.stack,
  });

  throw error;
}

// Export Firebase services
export const admin = {
  app: adminApp,
  auth: adminAuth,
  db: adminDb,
};

export const client = {
  app: clientApp,
  auth: clientAuth,
  db: clientDb,
  storage: clientStorage,
};

// Export commonly used services directly
export const auth = adminAuth;
export const db = adminDb;
