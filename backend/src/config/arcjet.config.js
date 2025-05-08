import Arcjet from "@arcjet/node";
import { config } from "@dotenvx/dotenvx";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, "..", "..", ".env");
config({ path: envPath });

// Check if we're in development mode
const isDevelopment = true;
// process.env.NODE_ENV === "development";

// Create a mock Arcjet instance for development
const createMockArcjet = () => ({
  protect: async (req) => ({
    allowed: true,
    type: "development",
    reason: "Development mode - protection disabled",
  }),
});

// Log configuration for debugging
console.log("Arcjet Configuration:", {
  key: process.env.ARCJET_API_KEY ? "Present" : "Missing",
  site: process.env.ARCJET_SITE,
  env: process.env.ARCJET_ENV,
});

// Initialize Arcjet instance with comprehensive protection
export const arcjet = isDevelopment
  ? createMockArcjet()
  : new Arcjet({
      key: process.env.ARCJET_SECRET,
      site: "mindquest",
      rules: [
        {
          name: "rate-limit",
          type: "rate-limit",
          max: 100,
          window: "1m",
        },
        {
          name: "bot",
          type: "bot",
          blockSuspicious: true,
        },
        {
          name: "ddos",
          type: "ddos",
          maxRequestsPerSecond: 10,
        },
        {
          name: "waf",
          type: "waf",
          blockXSS: true,
          blockSQLInjection: true,
          blockPathTraversal: true,
          blockCommandInjection: true,
        },
        {
          name: "email",
          type: "email",
          allowedDomains: ["iiitkottayam.ac.in"],
          validateFormat: true,
        },
        {
          name: "request-validation",
          type: "request-validation",
          body: {
            type: "object",
            properties: {
              email: {
                type: "string",
                format: "email",
                maxLength: 255,
              },
              password: {
                type: "string",
                minLength: 8,
                maxLength: 100,
              },
            },
            required: ["email", "password"],
          },
        },
      ],
    });

// Protection rules
export const protectionRules = {
  rateLimit: {
    enabled: true,
    max: 5,
    window: "1m",
  },
  bot: {
    enabled: true,
    blockSuspicious: true,
  },
  ddos: {
    enabled: true,
    threshold: 100,
    window: "1m",
    maxRequestsPerSecond: 10,
  },
  waf: {
    enabled: true,
    rules: {
      sqlInjection: true,
      xss: true,
      pathTraversal: true,
      commandInjection: true,
    },
    blockXSS: true,
    blockSQLInjection: true,
    blockPathTraversal: true,
  },
  email: {
    allowedDomains: ["iiitkottayam.ac.in"],
    validateFormat: true,
  },
  requestValidation: {
    body: {
      type: "object",
      properties: {
        email: {
          type: "string",
          format: "email",
          maxLength: 255,
        },
        password: {
          type: "string",
          minLength: 8,
          maxLength: 100,
        },
      },
      required: ["email", "password"],
    },
  },
};
