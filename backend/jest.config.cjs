module.exports = {
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/**/*.test.{js,jsx}",
    "!src/**/index.{js,jsx}",
  ],

  // The test environment that will be used for testing
  testEnvironment: "node",

  // A list of paths to directories that Jest should use to search for files in
  roots: ["<rootDir>/src", "<rootDir>/tests"],

  // The glob patterns Jest uses to detect test files
  testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],

  // An array of file extensions your modules use
  moduleFileExtensions: ["js", "json"],

  // A map from regular expressions to module names that allow to stub out resources
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^firebase-admin$": "<rootDir>/tests/__mocks__/firebase-admin.js",
    "^../src/services/(.*)$": "<rootDir>/tests/__mocks__/services.js",
  },

  // Transform files with babel-jest
  transform: {
    "^.+\\.js$": ["babel-jest", { rootMode: "upward" }],
  },

  // Setup files after env
  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],

  // Indicates whether each individual test should be reported during the run
  verbose: true,

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Mock all files in __mocks__ directories
  automock: false,

  // The paths to modules that run some code to configure or set up the testing environment
  setupFiles: ["<rootDir>/tests/setup.js"],

  // The coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
