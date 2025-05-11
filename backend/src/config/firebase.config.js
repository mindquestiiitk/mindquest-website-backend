/**
 * Firebase configuration and initialization
 * Provides Firebase Admin SDK instances for authentication and Firestore
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import config from "./config.js";
import logger from "../utils/logger.js";

// Initialize Firebase Admin
let app, auth, db;

try {
  logger.info("Initializing Firebase Admin SDK");

  // Check if required Firebase configuration is present
  if (
    !config.firebase.projectId ||
    !config.firebase.clientEmail ||
    !config.firebase.privateKey
  ) {
    throw new Error(
      "Missing Firebase configuration. Check environment variables."
    );
  }

  app = initializeApp({
    credential: cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    }),
    databaseURL: config.firebase.databaseURL,
  });

  auth = getAuth(app);
  db = getFirestore(app);

  // Configure Firestore
  db.settings({
    ignoreUndefinedProperties: true,
  });

  logger.info("Firebase initialized successfully", {
    projectId: config.firebase.projectId,
  });
} catch (error) {
  logger.error("Firebase initialization error", {
    error: error.message,
    stack: error.stack,
  });

  // In development, provide a mock implementation to allow the server to start
  if (config.isDevelopment) {
    logger.warn("Using mock Firebase implementation in development mode");

    // Mock implementations
    auth = {
      createUser: () => Promise.resolve({ uid: "mock-uid" }),
      getUserByEmail: () => Promise.resolve({ uid: "mock-uid" }),
      verifyIdToken: () => Promise.resolve({ uid: "mock-uid" }),
      setCustomUserClaims: () => Promise.resolve(),
      createCustomToken: () => Promise.resolve("mock-token"),
    };

    db = {
      collection: () => ({
        doc: () => ({
          get: () => Promise.resolve({ exists: true, data: () => ({}) }),
          set: () => Promise.resolve(),
          update: () => Promise.resolve(),
          delete: () => Promise.resolve(),
        }),
        where: () => ({
          get: () => Promise.resolve({ empty: true, docs: [] }),
        }),
        get: () => Promise.resolve({ docs: [] }),
      }),
    };
  } else {
    // In production, rethrow the error to prevent the server from starting with invalid Firebase config
    throw error;
  }
}

// Export Firebase services
export { auth, db };
