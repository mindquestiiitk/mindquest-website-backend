export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Handle validation errors
  if (err.statusCode === 400 && err.message.includes("required")) {
    return res.status(400).json({
      success: false,
      error: {
        message: err.message,
        code: "validation_error",
        status: "error",
      },
    });
  }

  // Handle Arcjet validation errors
  if (err.name === "ArcjetError") {
    return res.status(400).json({
      success: false,
      error: "Validation Error",
      details: err.details || err.message,
      type: "arcjet_validation",
    });
  }

  // Handle Arcjet rate limiting errors
  if (err.name === "ArcjetRateLimitError") {
    return res.status(429).json({
      success: false,
      error: "Rate Limit Exceeded",
      message: "Too many requests, please try again later",
      retryAfter: err.retryAfter,
    });
  }

  // Handle Arcjet security errors
  if (err.name === "ArcjetSecurityError") {
    return res.status(403).json({
      success: false,
      error: "Security Error",
      message: "Request blocked by security rules",
      details: err.details,
    });
  }

  // Handle Arcjet email validation errors
  if (err.name === "ArcjetEmailValidationError") {
    return res.status(403).json({
      success: false,
      error: "Email Validation Error",
      message: "Invalid email domain",
      details: err.details,
    });
  }

  // Handle Arcjet bot protection errors
  if (err.name === "ArcjetBotError") {
    return res.status(403).json({
      success: false,
      error: "Bot Detection",
      message: "Bot activity detected",
      details: err.details,
    });
  }

  // Handle Arcjet DDoS protection errors
  if (err.name === "ArcjetDDoSError") {
    return res.status(429).json({
      success: false,
      error: "DDoS Protection",
      message: "DDoS protection triggered",
      details: err.details,
    });
  }

  // Handle Arcjet WAF errors
  if (err.name === "ArcjetWAFError") {
    return res.status(403).json({
      success: false,
      error: "WAF Protection",
      message: "Request blocked by WAF",
      details: err.details,
    });
  }

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Invalid or expired token",
    });
  }

  if (err.name === "ForbiddenError") {
    return res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "You do not have permission to perform this action",
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: "Invalid Token",
      message: "Invalid token provided",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      error: "Token Expired",
      message: "Token has expired",
    });
  }

  // Handle Firebase Auth errors
  if (err.code && err.code.startsWith("auth/")) {
    return res.status(err.statusCode || 400).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        status: err.status || "error",
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Handle Firestore errors
  if (err.code && err.code.startsWith("firestore/")) {
    return res.status(err.statusCode || 400).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        status: err.status || "error",
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || "Something went wrong!",
      status: err.status || "error",
      code: err.code || "unknown_error",
    },
    timestamp: new Date().toISOString(),
  });
};
