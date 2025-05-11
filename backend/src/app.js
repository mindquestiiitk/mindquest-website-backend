/**
 * Main application entry point
 * Configures Express server, middleware, and routes
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.routes.js";
import merchRoutes from "./routes/merch.routes.js";
import eventsRoutes from "./routes/events.routes.js";
import teamsRoutes from "./routes/teams.routes.js";
import { arcjetProtection } from "./middleware/arcjet.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import config from "./config/config.js";
import logger from "./utils/logger.js";
import { successResponse } from "./utils/response.js";

// Import Firebase config to initialize it
import "./config/firebase.config.js";

// Create Express app and HTTP server
const app = express();
const httpServer = createServer(app);

// Apply CORS to all routes
app.use(cors(config.cors));

// Initialize Socket.IO with CORS configuration
const io = new Server(httpServer, {
  cors: config.cors,
});

// Request logging middleware
app.use(
  morgan(config.isDevelopment ? "dev" : "combined", {
    stream: {
      write: (message) => {
        logger.http(message.trim());
      },
    },
  })
);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" })); // Increase JSON payload limit for team data
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Global Arcjet protection (skip in development if needed)
if (!config.isDevelopment || process.env.ENABLE_ARCJET_IN_DEV) {
  app.use(arcjetProtection);
  logger.info("Arcjet protection enabled");
} else {
  logger.warn("Arcjet protection disabled in development mode");
}

// Routes
app.use("/auth", authRoutes);
app.use("/merch", merchRoutes);
app.use("/events", eventsRoutes);
app.use("/teams", teamsRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  successResponse(res, {
    message: "MindQuest API is running",
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: config.nodeEnv,
    services: {
      database: "connected",
      authentication: "active",
    },
  });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.errorCode = "not_found";
  next(error);
});

// Error handling middleware
app.use(errorHandler);

// Start the server
const PORT = config.port;
httpServer.listen(PORT, () => {
  logger.info(`Server started successfully`, {
    port: PORT,
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});
