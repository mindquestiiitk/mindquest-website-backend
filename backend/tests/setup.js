// Mock environment variables
process.env.FIREBASE_PROJECT_ID = "test-project";
process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
process.env.FIREBASE_PRIVATE_KEY = "test-key";

// Mock Firebase Admin
jest.mock("firebase-admin");

// Mock all services
jest.mock("../src/services/message.service.js");
jest.mock("../src/services/user.service.js");
jest.mock("../src/services/chat.service.js");
jest.mock("../src/services/admin.service.js");
jest.mock("../src/services/counselor.service.js");
jest.mock("../src/services/auth.service.js");
