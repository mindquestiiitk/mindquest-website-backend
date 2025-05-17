/**
 * Jest setup file
 * Runs before each test file
 */

// Import Jest globals for ES modules
import { jest } from "@jest/globals";

// Increase timeout for all tests
jest.setTimeout(30000);

// Silence console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
