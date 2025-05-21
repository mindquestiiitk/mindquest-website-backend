/**
 * Unified Firebase Configuration
 *
 * This module provides a single source of truth for all Firebase configuration,
 * including both Admin SDK and Client SDK instances.
 *
 * Production-ready configuration with secure credential handling, connection pooling,
 * and performance optimizations.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { initializeApp as initializeClientApp } from "firebase/app";
import { getAuth as getClientAuth } from "firebase/auth";
import { getFirestore as getClientFirestore } from "firebase/firestore";
import { getStorage as getClientStorage } from "firebase/storage";
import { connectFirestoreEmulator } from "firebase/firestore";
import { connectAuthEmulator } from "firebase/auth";
import { connectStorageEmulator } from "firebase/storage";
import logger from "../utils/logger.js";
import config from "./config.js";

// Performance monitoring
const PERF_MARKERS = new Map();

/**
 * Simple performance monitoring
 */
const perf = {
  mark: (name) => {
    PERF_MARKERS.set(name, Date.now());
    return () => perf.measure(name);
  },
  measure: (name) => {
    const start = PERF_MARKERS.get(name);
    if (start) {
      const duration = Date.now() - start;
      logger.debug(`⏱️ ${name}: ${duration}ms`);
      PERF_MARKERS.delete(name);
      return duration;
    }
    return 0;
  },
};

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

// Connection cache for Firebase services
const connectionCache = new Map();

/**
 * Get or create a Firebase service connection
 * @param {string} key - Cache key
 * @param {Function} factory - Factory function to create the service
 * @returns {any} The cached or newly created service
 */
function getOrCreateConnection(key, factory) {
  if (connectionCache.has(key)) {
    return connectionCache.get(key);
  }

  const connection = factory();
  connectionCache.set(key, connection);
  return connection;
}

// Initialize Firebase Admin SDK
let adminApp, adminAuth, adminDb;

// Initialize Firebase Client SDK
let clientApp, clientAuth, clientDb, clientStorage;

// Initialize Firebase Admin SDK
try {
  const adminInitMark = perf.mark("admin-sdk-init");
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

    // If using BASE64 encoded private key (recommended for production)
    if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
      try {
        privateKey = Buffer.from(
          process.env.FIREBASE_PRIVATE_KEY_BASE64,
          "base64"
        ).toString("utf8");
        logger.info("Using BASE64 encoded Firebase private key");
      } catch (decodeError) {
        logger.error("Failed to decode BASE64 private key", {
          error: decodeError.message,
        });
        throw new Error("Invalid BASE64 encoded private key");
      }
    } else {
      // Replace escaped newlines with actual newlines
      privateKey = privateKey?.replace(/\\n/g, "\n");
    }

    logger.info(
      `Using environment variables for Firebase Admin SDK credentials`
    );

    // Initialize with environment variables using connection pooling
    adminApp = getOrCreateConnection("adminApp", () =>
      initializeApp(
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
      )
    );
  } else {
    // For production, we must have proper credentials
    logger.error("No Firebase Admin credentials found in environment");
    throw new Error(
      "Firebase Admin SDK credentials are required. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables."
    );
  }

  // Get services with connection pooling
  adminAuth = getOrCreateConnection("adminAuth", () => getAdminAuth(adminApp));
  adminDb = getOrCreateConnection("adminDb", () => {
    const db = getAdminFirestore(adminApp);

    // Configure Firestore for production
    try {
      db.settings({
        ignoreUndefinedProperties: true,
      });
      logger.info("Applied Firestore admin settings successfully");
    } catch (error) {
      logger.warn("Could not apply Firestore admin settings", {
        error: error.message,
      });
    }

    return db;
  });

  adminInitMark();
  logger.info("Firebase Admin SDK initialized successfully", {
    projectId: firebaseConfig.projectId,
  });
} catch (error) {
  logger.error("Firebase Admin SDK initialization error", {
    error: error.message,
    stack: error.stack,
  });
  throw error;
}

// Initialize Firebase Client SDK
try {
  const clientInitMark = perf.mark("client-sdk-init");
  logger.info("Initializing Firebase Client SDK");

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    logger.warn(
      "Missing Firebase client configuration. Some features may not work properly."
    );
  }

  // Use connection pooling for client SDK
  clientApp = getOrCreateConnection("clientApp", () =>
    initializeClientApp(firebaseConfig, "client")
  );

  clientAuth = getOrCreateConnection("clientAuth", () =>
    getClientAuth(clientApp)
  );
  clientDb = getOrCreateConnection("clientDb", () => {
    // Get Firestore client instance
    const db = getClientFirestore(clientApp);

    // In Firebase v11+, the client SDK might handle settings differently
    // We'll just return the Firestore instance without additional settings
    return db;
  });

  clientStorage = getOrCreateConnection("clientStorage", () =>
    getClientStorage(clientApp)
  );

  // Connect to emulators in development mode if configured
  if (config.firebase.useEmulator) {
    const emulatorHost = config.firebase.emulatorHost || "localhost";

    // Connect to Auth emulator
    if (config.firebase.emulatorAuthPort) {
      connectAuthEmulator(
        clientAuth,
        `http://${emulatorHost}:${config.firebase.emulatorAuthPort}`,
        { disableWarnings: true }
      );
      logger.info(
        `Connected to Auth emulator at ${emulatorHost}:${config.firebase.emulatorAuthPort}`
      );
    }

    // Connect to Firestore emulator
    if (config.firebase.emulatorFirestorePort) {
      connectFirestoreEmulator(
        clientDb,
        emulatorHost,
        config.firebase.emulatorFirestorePort
      );
      logger.info(
        `Connected to Firestore emulator at ${emulatorHost}:${config.firebase.emulatorFirestorePort}`
      );
    }

    // Connect to Storage emulator if configured
    // Note: Storage emulator is optional and may not be configured
    const storageEmulatorPort = 9199; // Default Firebase storage emulator port
    if (config.isDevelopment) {
      try {
        connectStorageEmulator(
          clientStorage,
          emulatorHost,
          storageEmulatorPort
        );
        logger.info(
          `Connected to Storage emulator at ${emulatorHost}:${storageEmulatorPort}`
        );
      } catch (emulatorError) {
        logger.warn(
          `Failed to connect to Storage emulator: ${emulatorError.message}`
        );
      }
    }
  }

  clientInitMark();
  logger.info("Firebase Client SDK initialized successfully", {
    projectId: firebaseConfig.projectId,
    useEmulator: config.firebase.useEmulator || false,
  });
} catch (error) {
  logger.error("Firebase Client SDK initialization error", {
    error: error.message,
    stack: error.stack,
  });

  throw error;
}

// Export Firebase services with performance monitoring
export const admin = {
  app: adminApp,
  auth: adminAuth,
  db: adminDb,

  // Add performance-wrapped methods for common operations
  async verifyIdToken(token, checkRevoked = true) {
    const startTime = Date.now();
    try {
      const result = await adminAuth.verifyIdToken(token, checkRevoked);
      logger.debug(`⏱️ verifyIdToken completed in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      logger.error(`verifyIdToken failed after ${Date.now() - startTime}ms`, {
        error: error.message,
      });
      throw error;
    }
  },

  // Add connection status check
  isConnected() {
    return !!adminApp && !!adminAuth && !!adminDb;
  },
};

export const client = {
  app: clientApp,
  auth: clientAuth,
  db: clientDb,
  storage: clientStorage,

  // Add performance-wrapped methods for common operations
  async signInWithCustomToken(token) {
    const startTime = Date.now();
    try {
      const result = await clientAuth.signInWithCustomToken(token);
      logger.debug(
        `⏱️ signInWithCustomToken completed in ${Date.now() - startTime}ms`
      );
      return result;
    } catch (error) {
      logger.error(
        `signInWithCustomToken failed after ${Date.now() - startTime}ms`,
        { error: error.message }
      );
      throw error;
    }
  },

  // Add connection status check
  isConnected() {
    return !!clientApp && !!clientAuth && !!clientDb && !!clientStorage;
  },
};

// Add health check method for monitoring
export function getFirebaseStatus() {
  return {
    admin: {
      connected: admin.isConnected(),
      projectId: config.firebase.projectId,
    },
    client: {
      connected: client.isConnected(),
      projectId: config.firebase.projectId,
      useEmulator: config.firebase.useEmulator || false,
    },
    timestamp: new Date().toISOString(),
  };
}

// Export commonly used services directly
export const auth = adminAuth;
export const db = adminDb;
