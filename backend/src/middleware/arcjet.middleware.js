import { arcjet, protectionRules } from "../config/arcjet.config.js";
import { config } from "@dotenvx/dotenvx";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, "..", "..", ".env");
config({ path: envPath });

// Combined protection middleware
export const arcjetProtection = async (req, res, next) => {
  try {
    // Skip protection for health check endpoint and in development mode
    if (req.path === "/" || process.env.NODE_ENV === "development") {
      return next();
    }

    const result = await arcjet.protect({
      ip: req.ip,
      method: req.method,
      protocol: req.protocol,
      host: req.hostname,
      path: req.path,
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString(),
    });

    if (!result.allowed) {
      const error = new Error(result.reason || "Request blocked by Arcjet");
      error.name = getErrorType(result.type);
      error.details = result.details;
      if (result.retryAfter) {
        error.retryAfter = result.retryAfter;
      }
      throw error;
    }

    next();
  } catch (error) {
    // In development mode, log the error but continue
    if (process.env.NODE_ENV === "development") {
      console.warn("Arcjet error in development mode:", error.message);
      next();
    } else {
      console.error("Arcjet error:", error);
      next(new Error("Security service error"));
    }
  }
};

// Helper function to determine error type
const getErrorType = (type) => {
  switch (type) {
    case "rate-limit":
      return "ArcjetRateLimitError";
    case "bot":
      return "ArcjetBotError";
    case "ddos":
      return "ArcjetDDoSError";
    case "waf":
      return "ArcjetWAFError";
    case "email-validation":
      return "ArcjetEmailValidationError";
    case "request-validation":
      return "ArcjetError";
    case "development":
      return "ArcjetDevelopmentMode";
    default:
      return "ArcjetSecurityError";
  }
};

// Rate limiting middleware
export const rateLimit = async (req, res, next) => {
  try {
    const decision = await arcjet.protect({
      ip: req.ip,
      method: req.method,
      protocol: req.protocol,
      host: req.hostname,
      path: req.path,
      headers: req.headers,
      rateLimit: protectionRules.rateLimit,
    });

    if (decision.isDenied()) {
      return res.status(429).json({
        success: false,
        error: "Too many requests. Please try again later.",
      });
    }

    next();
  } catch (error) {
    console.error("Arcjet rate limit error:", error);
    next();
  }
};

// Bot protection middleware
export const botProtection = async (req, res, next) => {
  try {
    const decision = await arcjet.protect({
      ip: req.ip,
      method: req.method,
      protocol: req.protocol,
      host: req.hostname,
      path: req.path,
      headers: req.headers,
      bot: protectionRules.bot,
    });

    if (decision.isDenied()) {
      return res.status(403).json({
        success: false,
        error: "Bot activity detected. Access denied.",
      });
    }

    next();
  } catch (error) {
    console.error("Arcjet bot protection error:", error);
    next();
  }
};

// DDoS protection middleware
export const ddosProtection = async (req, res, next) => {
  try {
    const decision = await arcjet.protect({
      ip: req.ip,
      method: req.method,
      protocol: req.protocol,
      host: req.hostname,
      path: req.path,
      headers: req.headers,
      ddos: protectionRules.ddos,
    });

    if (decision.isDenied()) {
      return res.status(429).json({
        success: false,
        error: "DDoS protection triggered. Please try again later.",
      });
    }

    next();
  } catch (error) {
    console.error("Arcjet DDoS protection error:", error);
    next();
  }
};

// WAF (Web Application Firewall) middleware
export const wafProtection = async (req, res, next) => {
  try {
    const decision = await arcjet.protect({
      ip: req.ip,
      method: req.method,
      protocol: req.protocol,
      host: req.hostname,
      path: req.path,
      headers: req.headers,
      waf: protectionRules.waf,
    });

    if (decision.isDenied()) {
      return res.status(403).json({
        success: false,
        error: "Request blocked by WAF.",
      });
    }

    next();
  } catch (error) {
    console.error("Arcjet WAF error:", error);
    next();
  }
};

// Email domain validation middleware
export const emailDomainValidation = async (req, res, next) => {
  try {
    const email = req.body.email;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    // Check if email domain is allowed (simple validation for development)
    if (process.env.NODE_ENV !== "production") {
      // In development, allow any email domain
      console.log("Development mode: Skipping strict email domain validation");
      return next();
    }

    const decision = await arcjet.protect({
      ip: req.ip,
      method: req.method,
      protocol: req.protocol,
      host: req.hostname,
      path: req.path,
      headers: req.headers,
      email: {
        allowedDomains: ["iiitkottayam.ac.in"],
      },
    });

    // Check if decision has isDenied method or use the allowed property
    if (
      (typeof decision.isDenied === "function" && decision.isDenied()) ||
      (decision.isDenied === undefined && !decision.allowed)
    ) {
      return res.status(403).json({
        success: false,
        error:
          "Only iiitkottayam.ac.in email addresses are allowed to register",
      });
    }

    next();
  } catch (error) {
    console.error("Arcjet email validation error:", error);
    // In development, continue despite errors
    if (process.env.NODE_ENV === "development") {
      next();
    } else {
      next(error);
    }
  }
};
