/**
 * Arcjet Analytics Middleware
 * Enhanced security analytics and monitoring for Arcjet protection
 */

import logger from "../utils/logger.js";
import { db } from "../config/firebase.config.js";
import config from "../config/config.js";

/**
 * Track security metrics and patterns
 * This middleware runs after Arcjet protection to collect analytics
 */
export const arcjetAnalytics = async (req, res, next) => {
  try {
    // Only track when analytics are enabled
    if (!config.arcjet.enableAnalytics) {
      return next();
    }

    // Get Arcjet result from request (set by arcjetProtection middleware)
    const arcjetResult = req.arcjetResult;

    if (!arcjetResult) {
      return next();
    }

    // Prepare analytics data
    const analyticsData = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.headers["user-agent"] || "unknown",
      userId: req.user?.id || "anonymous",
      userRole: req.user?.role || "guest",
      decision: arcjetResult.decision,
      reason: arcjetResult.reason,
      ruleId: arcjetResult.ruleId,
      blocked: arcjetResult.flagged || false,
      responseTime: arcjetResult.responseTime || 0,
      country: req.headers["cf-ipcountry"] || "unknown", // Cloudflare country header
    };

    // Store analytics data asynchronously (don't block request)
    setImmediate(async () => {
      try {
        await storeSecurityAnalytics(analyticsData);
      } catch (error) {
        logger.error("Failed to store Arcjet analytics", {
          error: error.message,
          data: analyticsData,
        });
      }
    });

    // Track patterns for threat detection
    if (arcjetResult.flagged) {
      setImmediate(async () => {
        try {
          await trackThreatPattern(analyticsData);
        } catch (error) {
          logger.error("Failed to track threat pattern", {
            error: error.message,
            data: analyticsData,
          });
        }
      });
    }

    next();
  } catch (error) {
    logger.error("Arcjet analytics middleware error", {
      error: error.message,
      path: req.path,
    });

    // Don't block request on analytics failure
    next();
  }
};

/**
 * Store security analytics data in Firestore
 */
async function storeSecurityAnalytics(data) {
  try {
    // Store in daily collections for better performance
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const collectionName = `security_analytics_${date.replace(/-/g, "_")}`;

    await db.collection(collectionName).add({
      ...data,
      createdAt: new Date(),
    });

    // Also update daily summary
    await updateDailySummary(data, date);
  } catch (error) {
    logger.error("Failed to store security analytics", {
      error: error.message,
      data,
    });
  }
}

/**
 * Update daily security summary
 */
async function updateDailySummary(data, date) {
  try {
    const summaryRef = db.collection("security_summaries").doc(date);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(summaryRef);

      if (!doc.exists) {
        // Create new summary
        transaction.set(summaryRef, {
          date,
          totalRequests: 1,
          blockedRequests: data.blocked ? 1 : 0,
          uniqueIPs: [data.ip],
          reasons: data.reason ? { [data.reason]: 1 } : {},
          countries: data.country ? { [data.country]: 1 } : {},
          userRoles: data.userRole ? { [data.userRole]: 1 } : {},
          paths: data.path ? { [data.path]: 1 } : {},
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Update existing summary
        const summary = doc.data();
        const updates = {
          totalRequests: summary.totalRequests + 1,
          blockedRequests: summary.blockedRequests + (data.blocked ? 1 : 0),
          uniqueIPs: Array.from(new Set([...summary.uniqueIPs, data.ip])),
          updatedAt: new Date(),
        };

        // Update reason counts
        if (data.reason) {
          updates.reasons = {
            ...summary.reasons,
            [data.reason]: (summary.reasons[data.reason] || 0) + 1,
          };
        }

        // Update country counts
        if (data.country) {
          updates.countries = {
            ...summary.countries,
            [data.country]: (summary.countries[data.country] || 0) + 1,
          };
        }

        // Update user role counts
        if (data.userRole) {
          updates.userRoles = {
            ...summary.userRoles,
            [data.userRole]: (summary.userRoles[data.userRole] || 0) + 1,
          };
        }

        // Update path counts
        if (data.path) {
          updates.paths = {
            ...summary.paths,
            [data.path]: (summary.paths[data.path] || 0) + 1,
          };
        }

        transaction.update(summaryRef, updates);
      }
    });
  } catch (error) {
    logger.error("Failed to update daily summary", {
      error: error.message,
      date,
      data,
    });
  }
}

/**
 * Track threat patterns for advanced detection
 */
async function trackThreatPattern(data) {
  try {
    // Track by IP for potential IP-based threats
    const ipThreatRef = db
      .collection("threat_patterns")
      .doc(`ip_${data.ip.replace(/\./g, "_")}`);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(ipThreatRef);

      if (!doc.exists) {
        transaction.set(ipThreatRef, {
          ip: data.ip,
          firstSeen: new Date(),
          lastSeen: new Date(),
          totalAttempts: 1,
          reasons: { [data.reason]: 1 },
          paths: { [data.path]: 1 },
          userAgents: [data.userAgent],
          countries: data.country ? [data.country] : [],
          riskScore: calculateRiskScore(data),
          status: "monitoring",
        });
      } else {
        const threat = doc.data();
        const updates = {
          lastSeen: new Date(),
          totalAttempts: threat.totalAttempts + 1,
          reasons: {
            ...threat.reasons,
            [data.reason]: (threat.reasons[data.reason] || 0) + 1,
          },
          paths: {
            ...threat.paths,
            [data.path]: (threat.paths[data.path] || 0) + 1,
          },
          userAgents: Array.from(
            new Set([...threat.userAgents, data.userAgent])
          ),
          countries: data.country
            ? Array.from(new Set([...threat.countries, data.country]))
            : threat.countries,
        };

        // Recalculate risk score
        updates.riskScore = calculateRiskScore({ ...threat, ...updates });

        // Auto-escalate high-risk threats
        if (updates.riskScore > 80 && threat.status === "monitoring") {
          updates.status = "high_risk";

          // Log high-risk threat for admin attention
          logger.warn("High-risk threat pattern detected", {
            ip: data.ip,
            riskScore: updates.riskScore,
            totalAttempts: updates.totalAttempts,
            reasons: updates.reasons,
          });
        }

        transaction.update(ipThreatRef, updates);
      }
    });
  } catch (error) {
    logger.error("Failed to track threat pattern", {
      error: error.message,
      data,
    });
  }
}

/**
 * Calculate risk score based on threat data
 */
function calculateRiskScore(threatData) {
  let score = 0;

  // Base score for attempts
  score += Math.min(threatData.totalAttempts * 5, 50);

  // Score for different types of violations
  const reasonScores = {
    BOT: 20,
    RATE_LIMITED: 10,
    GEO_BLOCKED: 15,
    CONTENT_FILTERED: 25,
    SPAM_DETECTED: 30,
    ABUSE_DETECTED: 35,
    WAF: 40,
  };

  Object.entries(threatData.reasons || {}).forEach(([reason, count]) => {
    score += (reasonScores[reason] || 5) * Math.min(count, 5);
  });

  // Score for multiple user agents (potential bot)
  if (threatData.userAgents && threatData.userAgents.length > 3) {
    score += 15;
  }

  // Score for multiple countries (potential proxy/VPN)
  if (threatData.countries && threatData.countries.length > 2) {
    score += 10;
  }

  // Score for targeting admin paths
  const adminPaths = Object.keys(threatData.paths || {}).filter(
    (path) => path.includes("/admin") || path.includes("/superadmin")
  );
  if (adminPaths.length > 0) {
    score += 20;
  }

  return Math.min(score, 100); // Cap at 100
}

/**
 * Get security analytics for admin dashboard
 */
export async function getSecurityAnalytics(days = 7) {
  try {
    const analytics = {
      summary: {},
      dailyStats: [],
      topThreats: [],
      recentBlocks: [],
    };

    // Get recent daily summaries
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const summariesSnapshot = await db
      .collection("security_summaries")
      .where("date", ">=", startDate.toISOString().split("T")[0])
      .where("date", "<=", endDate.toISOString().split("T")[0])
      .orderBy("date", "desc")
      .get();

    analytics.dailyStats = summariesSnapshot.docs.map((doc) => ({
      date: doc.id,
      ...doc.data(),
    }));

    // Calculate overall summary
    analytics.summary = analytics.dailyStats.reduce(
      (acc, day) => ({
        totalRequests: (acc.totalRequests || 0) + day.totalRequests,
        blockedRequests: (acc.blockedRequests || 0) + day.blockedRequests,
        uniqueIPs: acc.uniqueIPs
          ? [...acc.uniqueIPs, ...day.uniqueIPs]
          : day.uniqueIPs,
        topReasons: mergeObjectCounts(acc.topReasons, day.reasons),
        topCountries: mergeObjectCounts(acc.topCountries, day.countries),
      }),
      {}
    );

    // Get top threats
    const threatsSnapshot = await db
      .collection("threat_patterns")
      .orderBy("riskScore", "desc")
      .limit(10)
      .get();

    analytics.topThreats = threatsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return analytics;
  } catch (error) {
    logger.error("Failed to get security analytics", { error: error.message });
    throw error;
  }
}

/**
 * Helper function to merge object counts
 */
function mergeObjectCounts(obj1 = {}, obj2 = {}) {
  const merged = { ...obj1 };
  Object.entries(obj2).forEach(([key, value]) => {
    merged[key] = (merged[key] || 0) + value;
  });
  return merged;
}
