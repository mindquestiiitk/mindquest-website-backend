/**
 * Centralized logging utility
 * Provides consistent logging across the application
 */

import config from "../config/config.js";

// ANSI color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m"
};

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  HTTP: 3,
  DEBUG: 4,
};

// Current log level based on environment
const currentLogLevel = config.isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

/**
 * Format log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {string} - Formatted log message
 */
const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length 
    ? JSON.stringify(meta, null, config.isDevelopment ? 2 : 0)
    : '';
  
  return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaString}`;
};

/**
 * Log to console with color
 * @param {string} level - Log level
 * @param {string} color - ANSI color code
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
const logToConsole = (level, color, message, meta = {}) => {
  const formattedMessage = formatLog(level, message, meta);
  console.log(`${color}${formattedMessage}${colors.reset}`);
};

/**
 * Check if the log level should be logged
 * @param {number} level - Log level to check
 * @returns {boolean} - Whether the log level should be logged
 */
const shouldLog = (level) => {
  return level <= currentLogLevel;
};

// Logger object
const logger = {
  error: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.ERROR)) {
      logToConsole('error', colors.red, message, meta);
    }
  },
  
  warn: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.WARN)) {
      logToConsole('warn', colors.yellow, message, meta);
    }
  },
  
  info: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.INFO)) {
      logToConsole('info', colors.green, message, meta);
    }
  },
  
  http: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.HTTP)) {
      logToConsole('http', colors.cyan, message, meta);
    }
  },
  
  debug: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      logToConsole('debug', colors.blue, message, meta);
    }
  },
  
  /**
   * Log request details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  request: (req, res) => {
    if (shouldLog(LOG_LEVELS.HTTP)) {
      const meta = {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip,
        status: res.statusCode,
        userAgent: req.headers['user-agent'],
        userId: req.user?.id,
      };
      
      logToConsole('http', colors.cyan, `${req.method} ${req.originalUrl || req.url}`, meta);
    }
  },
};

export default logger;
