import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { arcjetMiddleware } from "./arcjet.config.js";

export const configureExpress = (app) => {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    cors({
      origin: process.env.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(arcjetMiddleware);

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  });
};
