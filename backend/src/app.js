import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import { arcjetProtection } from "./middleware/arcjet.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import config from "./config/config.js";
import logger from "./utils/logger.js";

// Import modules
import "./config/firebase.config.js";
import { logIndexRecommendations } from "./utils/firebase-performance.js";
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
import chatRoutes from "./routes/chat.routes.js";
import counselorRoutes from "./routes/counselor.routes.js";
import arcjetRoutes from "./routes/arcjet.routes.js";
import oauthRoutes from "./routes/oauth.routes.js";

const app = express();
const httpServer = createServer(app);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) {
        logger.debug("CORS allowing request with no origin");
        return callback(null, true);
      }

      // Define allowed origins
      const allowedOrigins = [
        config.clientUrl,
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        // Add any additional origins needed
      ];

      // In development mode, allow all origins
      if (allowedOrigins.includes(origin) || config.isDevelopment) {
        logger.debug(`CORS allowing origin: ${origin}`);
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true, // Important for cookies and authentication
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
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
      "x-request-timestamp",
      "cookie", // Allow cookie header
      "set-cookie", // Allow set-cookie header
    ],
    exposedHeaders: [
      "x-request-id",
      "x-token-expiring-soon",
      "x-token-expires-in",
      "x-request-timestamp",
      "set-cookie", // Expose set-cookie header
    ],
    maxAge: 86400, // How long the results of a preflight request can be cached (in seconds) - 24 hours
  })
);

new Server(httpServer, {
  cors: {
    origin: [
      config.clientUrl,
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:8080",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
      // Add any additional origins needed
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
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
      "x-request-timestamp",
      "cookie",
      "set-cookie",
    ],
  },
});

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

// Parse cookies
app.use(cookieParser(config.cookieSecret || "mindquest-secret-key"));

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

// Import the auth controller for direct route
import { AuthController } from "./controllers/auth.controller.js";
const authController = new AuthController();

// Register all routes
app.use("/auth", authRoutes);
app.use("/merch", merchRoutes);
app.use("/events", eventsRoutes);
app.use("/teams", teamsRoutes);
app.use("/admin", adminRoutes);
app.use("/superadmin", superadminRoutes);
app.use("/health", healthRoutes);
app.use("/users", userRoutes);
app.use("/chat", chatRoutes);
app.use("/counselors", counselorRoutes);
app.use("/api", arcjetRoutes);
app.use("/oauth", oauthRoutes);

// Add OPTIONS handler for the direct verify-token endpoint
app.options("/verify-token", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-request-id, x-request-timestamp, x-requested-with, accept, origin, cache-control, x-api-key"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400"); // 24 hours
  res.status(204).end();

  logger.debug("OPTIONS request for direct verify-token endpoint", {
    origin: req.headers.origin,
    path: req.path,
  });
});

// Add direct route for verify-token as a fallback
// This ensures the endpoint is accessible even if there's an issue with the auth routes
app.post("/verify-token", (req, res, next) => {
  logger.info("Direct verify-token endpoint accessed");

  // Set CORS headers for this specific route
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Expose-Headers",
    "x-request-id, x-token-expiring-soon, x-token-expires-in, x-request-timestamp"
  );

  // Log request details for debugging
  const authHeader = req.headers.authorization;
  const hasValidAuthHeader = authHeader && authHeader.startsWith("Bearer ");
  const hasCookieToken = req.cookies && req.cookies.token;
  const hasQueryToken = req.query && req.query.token;

  logger.debug("Direct token verification request received", {
    hasValidAuthHeader,
    hasCookieToken,
    hasQueryToken,
    origin: req.headers.origin,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    cookies: req.cookies ? Object.keys(req.cookies) : [],
    query: req.query ? Object.keys(req.query) : [],
  });

  // Forward to the auth controller
  authController.verifyToken(req, res, next);
});

// Add direct route for Google OAuth sign-in
app.options("/google-auth", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-request-id, x-request-timestamp, x-requested-with, accept, origin, cache-control, x-api-key"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400"); // 24 hours
  res.status(204).end();

  logger.debug("OPTIONS request for direct Google OAuth endpoint", {
    origin: req.headers.origin,
    path: req.path,
  });
});

// Import OAuth controller for direct route
import { oAuthController } from "./controllers/oauth.controller.js";

app.post("/google-auth", (req, res, next) => {
  logger.info("Direct Google OAuth endpoint accessed");

  // Set CORS headers for this specific route
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");

  // Forward to the OAuth controller
  oAuthController.handleGoogleSignIn(req, res, next);
});

// Add direct route for registration as a fallback
// This ensures the endpoint is accessible even if there's an issue with the auth routes
app.options("/register", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-request-id, x-request-timestamp, x-requested-with, accept, origin, cache-control, x-api-key"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400"); // 24 hours
  res.status(204).end();

  logger.debug("OPTIONS request for direct register endpoint", {
    origin: req.headers.origin,
    path: req.path,
  });
});

app.post("/register", (req, res, next) => {
  logger.info("Direct register endpoint accessed");

  // Set CORS headers for this specific route
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");

  // Log request details for debugging
  logger.debug("Direct registration request received", {
    origin: req.headers.origin,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    hasIdToken: !!req.body.idToken,
    hasEmail: !!req.body.email,
  });

  // Forward to the auth controller
  authController.register(req, res, next);
});

// Root route redirects to health check
app.get("/", (_, res) => {
  res.redirect("/health");
});

// Add a test endpoint to verify API is working
app.get("/api-test", (req, res) => {
  logger.info("API test endpoint accessed", {
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    path: req.path,
  });

  res.json({
    success: true,
    message: "API is working correctly",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: "/auth/*",
      health: "/health",
      verify: "/verify-token",
    },
  });
});

app.use((req, _, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.errorCode = "not_found";
  next(error);
});

app.use(errorHandler);

if (config.isDevelopment) {
  logIndexRecommendations();
}

// Initialize minimal task scheduler for token cleanup
// For production, consider using Firebase Cloud Functions instead
if (config.isDevelopment) {
  initializeScheduler();
}

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
