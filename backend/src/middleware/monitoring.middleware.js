/**
 * Production Monitoring Middleware
 * Tracks Firebase quota usage, API performance, and error rates
 */

import logger from "../utils/logger.js";
import { getCacheStats } from "../utils/firebase-cache.js";

// Monitoring metrics storage
const metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    quotaErrors: 0,
  },
  performance: {
    averageResponseTime: 0,
    slowRequests: 0, // > 1000ms
    fastRequests: 0, // < 100ms
  },
  firebase: {
    reads: 0,
    writes: 0,
    quotaExhausted: false,
    lastQuotaError: null,
  },
  cache: {
    hits: 0,
    misses: 0,
    hitRate: 0,
  },
  errors: {
    byType: {},
    recent: [],
  },
};

// Reset metrics daily
const resetMetrics = () => {
  Object.keys(metrics.requests).forEach((key) => (metrics.requests[key] = 0));
  Object.keys(metrics.performance).forEach(
    (key) => (metrics.performance[key] = 0)
  );
  Object.keys(metrics.firebase).forEach((key) => {
    if (typeof metrics.firebase[key] === "number") {
      metrics.firebase[key] = 0;
    }
  });
  metrics.firebase.quotaExhausted = false;
  metrics.firebase.lastQuotaError = null;
  Object.keys(metrics.cache).forEach((key) => {
    if (typeof metrics.cache[key] === "number") {
      metrics.cache[key] = 0;
    }
  });
  metrics.errors.byType = {};
  metrics.errors.recent = [];

  logger.info("📊 Daily metrics reset completed");
};

// Reset metrics at midnight
const scheduleMetricsReset = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const msUntilMidnight = tomorrow.getTime() - now.getTime();

  setTimeout(() => {
    resetMetrics();
    // Schedule daily resets
    setInterval(resetMetrics, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
};

scheduleMetricsReset();

/**
 * Request monitoring middleware
 */
export const requestMonitoring = (req, res, next) => {
  const startTime = Date.now();

  // Track request start
  metrics.requests.total++;

  // Override res.json to capture response
  const originalJson = res.json;
  res.json = function (data) {
    const responseTime = Date.now() - startTime;

    // Update performance metrics
    if (responseTime > 1000) {
      metrics.performance.slowRequests++;
    } else if (responseTime < 100) {
      metrics.performance.fastRequests++;
    }

    // Update average response time
    const totalRequests = metrics.requests.total;
    metrics.performance.averageResponseTime =
      (metrics.performance.averageResponseTime * (totalRequests - 1) +
        responseTime) /
      totalRequests;

    // Track success/failure
    if (res.statusCode >= 200 && res.statusCode < 300) {
      metrics.requests.successful++;
    } else {
      metrics.requests.failed++;

      // Check for quota errors
      if (
        data &&
        (data.error?.includes("quota") ||
          data.error?.includes("resource-exhausted") ||
          data.message?.includes("high demand"))
      ) {
        metrics.requests.quotaErrors++;
        metrics.firebase.quotaExhausted = true;
        metrics.firebase.lastQuotaError = new Date().toISOString();

        logger.warn("🚨 Quota exhaustion detected in response", {
          path: req.path,
          method: req.method,
          responseTime,
        });
      }
    }

    // Log slow requests
    if (responseTime > 1000) {
      logger.warn("🐌 Slow request detected", {
        path: req.path,
        method: req.method,
        responseTime: `${responseTime}ms`,
        userAgent: req.get("User-Agent"),
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Error monitoring middleware
 */
export const errorMonitoring = (err, req, res, next) => {
  const errorType = err.constructor.name;

  // Track error by type
  if (!metrics.errors.byType[errorType]) {
    metrics.errors.byType[errorType] = 0;
  }
  metrics.errors.byType[errorType]++;

  // Add to recent errors (keep last 50)
  metrics.errors.recent.unshift({
    type: errorType,
    message: err.message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get("User-Agent"),
    ip: req.ip,
  });

  if (metrics.errors.recent.length > 50) {
    metrics.errors.recent = metrics.errors.recent.slice(0, 50);
  }

  // Check for quota errors
  const isQuotaError =
    err.message?.includes("quota") ||
    err.message?.includes("resource-exhausted") ||
    err.code === "resource-exhausted" ||
    err.code === 8;

  if (isQuotaError) {
    metrics.requests.quotaErrors++;
    metrics.firebase.quotaExhausted = true;
    metrics.firebase.lastQuotaError = new Date().toISOString();

    logger.error("🚨 Firebase quota exhaustion error", {
      error: err.message,
      path: req.path,
      method: req.method,
    });
  }

  next(err);
};

/**
 * Firebase operation tracking
 */
export const trackFirebaseOperation = (operation, type = "read") => {
  if (type === "read") {
    metrics.firebase.reads++;
  } else if (type === "write") {
    metrics.firebase.writes++;
  }

  logger.debug(`Firebase ${type} operation tracked`, { operation });
};

/**
 * Cache performance tracking
 */
export const updateCacheMetrics = () => {
  const cacheStats = getCacheStats();
  metrics.cache.hits = cacheStats.validEntries || 0;
  metrics.cache.misses = cacheStats.expiredEntries || 0;
  metrics.cache.hitRate = cacheStats.hitRate || 0;
};

/**
 * Get current metrics
 */
export const getMetrics = () => {
  updateCacheMetrics();

  return {
    ...metrics,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    quotaStatus: {
      exhausted: metrics.firebase.quotaExhausted,
      lastError: metrics.firebase.lastQuotaError,
      errorRate:
        metrics.requests.total > 0
          ? (
              (metrics.requests.quotaErrors / metrics.requests.total) *
              100
            ).toFixed(2) + "%"
          : "0%",
    },
    performance: {
      ...metrics.performance,
      successRate:
        metrics.requests.total > 0
          ? (
              (metrics.requests.successful / metrics.requests.total) *
              100
            ).toFixed(2) + "%"
          : "100%",
      errorRate:
        metrics.requests.total > 0
          ? ((metrics.requests.failed / metrics.requests.total) * 100).toFixed(
              2
            ) + "%"
          : "0%",
    },
  };
};

/**
 * Health check endpoint data
 */
export const getHealthStatus = () => {
  const currentMetrics = getMetrics();

  const isHealthy =
    !currentMetrics.firebase.quotaExhausted &&
    currentMetrics.performance.averageResponseTime < 2000 &&
    currentMetrics.requests.failed /
      Math.max(currentMetrics.requests.total, 1) <
      0.1;

  return {
    status: isHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    checks: {
      quotaStatus: !currentMetrics.firebase.quotaExhausted,
      responseTime: currentMetrics.performance.averageResponseTime < 2000,
      errorRate:
        currentMetrics.requests.failed /
          Math.max(currentMetrics.requests.total, 1) <
        0.1,
      cachePerformance: currentMetrics.cache.hitRate > 0.5,
    },
    metrics: currentMetrics,
  };
};

export default {
  requestMonitoring,
  errorMonitoring,
  trackFirebaseOperation,
  updateCacheMetrics,
  getMetrics,
  getHealthStatus,
};
