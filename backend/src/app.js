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
import "./config/firebase.config.js";
import { arcjetProtection } from "./middleware/arcjet.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
  origin: [process.env.FRONTEND_URL || "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  exposedHeaders: ["Set-Cookie"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS to all routes
app.use(cors(corsOptions));

// Socket.IO CORS configuration
const io = new Server(httpServer, {
  cors: corsOptions,
});

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
  })
);

// Global Arcjet protection
app.use(arcjetProtection);

app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" })); // Increase JSON payload limit for team data

// Routes
app.use("/auth", authRoutes);
app.use("/merch", merchRoutes);
app.use("/events", eventsRoutes);
app.use("/teams", teamsRoutes);

// Health check endpoint with minimal protection
app.get("/", (req, res) => {
  res.json({
    message: "MindQuest API is running",
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    services: {
      database: "connected",
      authentication: "active",
    },
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
