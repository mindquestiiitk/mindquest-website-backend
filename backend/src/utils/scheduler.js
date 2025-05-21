/**
 * Task Scheduler
 *
 * This utility provides a simple scheduler for running periodic tasks.
 *
 * Note: For a production Firebase app, consider using Firebase Cloud Functions
 * with scheduled triggers instead of this custom implementation.
 *
 * Example Cloud Function:
 * exports.scheduledFunction = functions.pubsub.schedule('every 24 hours').onRun(async context => {
 *   // Scheduled code here
 * });
 */

import logger from "./logger.js";
import { runTokenCleanup } from "./session-cleanup.js";

// Store scheduled tasks
const scheduledTasks = new Map();

/**
 * Schedule a task to run periodically
 * @param {string} taskName - Name of the task
 * @param {Function} taskFn - Function to execute
 * @param {number} intervalMs - Interval in milliseconds
 * @returns {Object} Task information
 */
export function scheduleTask(taskName, taskFn, intervalMs) {
  // Clear any existing task with the same name
  if (scheduledTasks.has(taskName)) {
    clearInterval(scheduledTasks.get(taskName).intervalId);
    logger.info(`Replaced existing scheduled task: ${taskName}`);
  }

  // Schedule the task
  const intervalId = setInterval(async () => {
    try {
      logger.debug(`Running scheduled task: ${taskName}`);
      await taskFn();
    } catch (error) {
      logger.error(`Error in scheduled task ${taskName}:`, {
        error: error.message,
        stack: error.stack,
      });
    }
  }, intervalMs);

  // Store task information
  const taskInfo = {
    name: taskName,
    intervalId,
    intervalMs,
    createdAt: new Date().toISOString(),
  };

  scheduledTasks.set(taskName, taskInfo);
  logger.info(`Scheduled task: ${taskName}, interval: ${intervalMs}ms`);

  return taskInfo;
}

/**
 * Initialize minimal scheduled tasks
 * Only run token cleanup once a day to avoid excessive Firestore operations
 */
export function initializeScheduler() {
  logger.info("Initializing minimal task scheduler");

  // Schedule token cleanup once a day (24 hours)
  const tokenCleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
  scheduleTask("tokenCleanup", runTokenCleanup, tokenCleanupInterval);

  logger.info("Minimal task scheduler initialized");
}

/**
 * Shutdown the scheduler and cancel all tasks
 */
export function shutdownScheduler() {
  logger.info("Shutting down task scheduler");

  for (const [taskName, task] of scheduledTasks.entries()) {
    clearInterval(task.intervalId);
    logger.info(`Cancelled scheduled task: ${taskName}`);
  }

  scheduledTasks.clear();
  logger.info("Task scheduler shut down");
}
