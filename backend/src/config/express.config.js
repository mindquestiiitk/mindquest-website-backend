import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { arcjetMiddleware } from "./arcjet.config.js";
import config from "./config.js";
import { createCorsConfig } from "./cors.config.js";

export const configureExpress = (app) => {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  // Apply CORS middleware with centralized configuration
  app.use(cors(createCorsConfig()));
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(arcjetMiddleware);

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      error: "Internal Server Error",
      message: config.isDevelopment ? err.message : undefined,
      timestamp: new Date().toISOString(),
    });
  });
};
