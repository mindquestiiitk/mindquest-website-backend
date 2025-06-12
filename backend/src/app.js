import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { arcjetProtection } from "./middleware/arcjet.middleware.js";
import { arcjetAnalytics } from "./middleware/arcjet-analytics.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import config from "./config/config.js";
import logger from "./utils/logger.js";
import { createCorsConfig } from "./config/cors.config.js";
import { initializeSocket } from "./config/socket.config.js";

// Import modules
import "./config/firebase.config.js";
import { initializeScheduler } from "./utils/scheduler.js";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import merchRoutes from "./routes/merch.routes.js";
import eventsRoutes from "./routes/events.routes.js";
import teamsRoutes from "./routes/teams.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import superadminRoutes from "./routes/superadmin.routes.js";
import healthRoutes from "./routes/health.routes.js";
import userRoutes from "./routes/user.routes.js";
// Removed unused chat and counselor routes to reduce technical debt
import arcjetRoutes from "./routes/arcjet.routes.js";

const app = express();
const httpServer = createServer(app);

// Apply CORS middleware with centralized configuration
app.use(cors(createCorsConfig()));

// Initialize Socket.IO with proper configuration and event handlers
const io = initializeSocket(httpServer);

app.use(
  morgan(config.isDevelopment ? "dev" : "combined", {
    stream: {
      write: (message) => {
        logger.http(message.trim());
      },
    },
  })
);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: config.security.contentSecurityPolicy,
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
  })
);

// Apply JSON and URL-encoded body parsers with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Parse cookies with secure secret from environment variables
// Generate a random secret if none is provided to avoid hardcoded values
import crypto from "crypto";
app.use(
  cookieParser(
    config.cookieSecret ||
      process.env.COOKIE_SECRET ||
      crypto.randomBytes(32).toString("hex")
  )
);

// Apply Arcjet protection to all routes
// This provides comprehensive security including rate limiting, bot protection, and more
if (!config.isDevelopment || config.arcjet.enableInDev) {
  // Apply Arcjet protection globally but skip certain paths
  app.use((req, res, next) => {
    // Skip Arcjet for health checks and static assets to avoid rate limiting issues
    if (
      req.path === "/health" ||
      req.path === "/" ||
      req.path.startsWith("/static/") ||
      req.path.startsWith("/assets/")
    ) {
      return next();
    }

    // Skip Arcjet for routes that already have it applied in their route handlers
    // This prevents double application of Arcjet protection
    if (
      req.path.startsWith("/auth/") ||
      req.path.startsWith("/admin/") ||
      req.path.startsWith("/superadmin/")
    ) {
      // These routes already have Arcjet protection applied in their route handlers
      return next();
    }

    // Apply Arcjet protection to all other routes
    arcjetProtection(req, res, next);
  });

  logger.info("Arcjet protection enabled for all routes");
} else {
  logger.warn("Arcjet protection disabled in development mode");
}

// Register all routes
app.use("/auth", authRoutes);
app.use("/merch", merchRoutes);
app.use("/events", eventsRoutes);
app.use("/teams", teamsRoutes);
app.use("/admin", adminRoutes);
app.use("/superadmin", superadminRoutes);
app.use("/health", healthRoutes);
app.use("/users", userRoutes);
// Removed unused chat and counselor endpoints to reduce technical debt
app.use("/api", arcjetRoutes);

// Apply Arcjet analytics middleware after routes to collect security metrics
// This runs after Arcjet protection to analyze and store security data
app.use(arcjetAnalytics);

// Root route redirects to health check
app.get("/", (_, res) => {
  res.redirect("/health");
});

app.use((req, _, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.errorCode = "not_found";
  next(error);
});

app.use(errorHandler);

// Initialize task scheduler for token cleanup
initializeScheduler();

const PORT = config.port;
httpServer.listen(PORT, () => {
  logger.info(`Server started successfully`, {
    port: PORT,
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });

  // Log security features that are enabled
  logger.info("Security features enabled:", {
    arcjet: config.arcjet.apiKey ? true : false,
    firebase: true,
    helmet: true,
    cors: true,
  });

  // Log Firebase configuration
  logger.info("Firebase configuration:", {
    projectId: config.firebase.projectId || "not-set",
    databaseURL: config.firebase.databaseURL ? "configured" : "not-set",
    storageBucket: config.firebase.storageBucket ? "configured" : "not-set",
  });
});

export default app;
