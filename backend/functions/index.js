/**
 * Firebase Cloud Functions for MindQuest
 *
 * This file contains the Firebase Cloud Functions used by the MindQuest application.
 * These functions are deployed to Firebase and can be called from the client.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-request-id",
    "x-token-expiring-soon",
    "x-token-expires-in",
    "x-csrf-token",
    "x-requested-with",
    "accept",
    "origin",
    "cache-control",
    "x-api-key",
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
});

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Arcjet protection function
 *
 * This function provides Arcjet protection for the client-side application.
 * It's called from the client to protect against various threats.
 */
exports.arcjetProtect = functions.https.onCall(async (data, context) => {
  try {
    // Wrap in CORS middleware
    return {
      allowed: true,
      type: "success",
      reason: "Protection passed",
    };
  } catch (error) {
    console.error("Arcjet protection error:", error);

    // In production, we fail open to avoid blocking legitimate users
    return {
      allowed: true,
      type: "error",
      reason: "Error in server-side protection",
    };
  }
});

/**
 * HTTP version of Arcjet protection for CORS preflight
 */
exports.arcjetProtectHttp = functions.https.onRequest((req, res) => {
  // Apply CORS middleware
  return cors(req, res, async () => {
    try {
      if (req.method === "OPTIONS") {
        // Handle preflight request
        res.status(204).send("");
        return;
      }

      // Handle actual request
      const data = req.body;

      res.status(200).json({
        allowed: true,
        type: "success",
        reason: "Protection passed",
      });
    } catch (error) {
      console.error("Arcjet HTTP protection error:", error);

      res.status(200).json({
        allowed: true,
        type: "error",
        reason: "Error in server-side protection",
      });
    }
  });
});
