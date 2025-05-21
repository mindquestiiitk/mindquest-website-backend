/**
 * Health Check Utilities
 * 
 * This module provides utilities for checking the health of various services.
 */

import { db, auth } from "../config/firebase.config.js";
import logger from "./logger.js";

/**
 * Check database connectivity
 * @returns {Promise<boolean>} Whether the database is connected
 */
export async function checkDatabaseConnectivity() {
  try {
    // Try to read a document from Firestore
    const healthCheckRef = db.collection('system').doc('health');
    await healthCheckRef.set({
      lastChecked: new Date().toISOString(),
      status: 'ok'
    });
    
    return true;
  } catch (error) {
    logger.error("Database connectivity check failed", { error: error.message });
    return false;
  }
}

/**
 * Check authentication service status
 * @returns {Promise<boolean>} Whether the auth service is active
 */
export async function checkAuthServiceStatus() {
  try {
    // Try to list users (limit to 1) to check if auth service is working
    await auth.listUsers(1);
    return true;
  } catch (error) {
    logger.error("Auth service check failed", { error: error.message });
    return false;
  }
}

/**
 * Get system health information
 * @returns {Object} System health information
 */
export function getSystemInfo() {
  return {
    uptime: process.uptime(),
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    },
    cpu: process.cpuUsage(),
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
  };
}

/**
 * Comprehensive health check
 * @returns {Promise<Object>} Health check result
 */
export async function performHealthCheck() {
  try {
    // Check database connectivity
    const dbStatus = await checkDatabaseConnectivity();
    
    // Check authentication service
    const authStatus = await checkAuthServiceStatus();
    
    // Get system information
    const systemInfo = getSystemInfo();
    
    return {
      status: dbStatus && authStatus ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      systemInfo,
      services: {
        database: dbStatus ? 'connected' : 'disconnected',
        authentication: authStatus ? 'active' : 'inactive',
      },
    };
  } catch (error) {
    logger.error("Health check failed", { error: error.message });
    
    return {
      status: 'degraded',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: 'unknown',
        authentication: 'unknown',
      },
    };
  }
}
