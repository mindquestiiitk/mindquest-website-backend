/**
 * Jest configuration
 */
export default {
  transform: {},
  extensionsToTreatAsEsm: [],

  testEnvironment: "node",

  testMatch: ["**/tests/**/*.test.js"],

  collectCoverageFrom: ["src/**/*.js", "!src/app.js", "!src/config/**/*.js"],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  testTimeout: 30000,

  setupFilesAfterEnv: ["./tests/setup.js"],
};
