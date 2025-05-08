import express from "express";
import { UserController } from "../src/controllers/user.controller.js";
import { jest } from "@jest/globals";
import { UserModel } from "../src/models/user.model.js";
import { UserRole } from "../src/services/auth.service.js";

// Mock Firebase Admin
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(() => ({
      getAccessToken: jest.fn(),
    })),
  },
  auth: () => ({
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getUserByEmail: jest.fn(),
    verifyIdToken: jest.fn(),
  }),
  firestore: () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      where: jest.fn(() => ({
        get: jest.fn(),
        orderBy: jest.fn(),
        limit: jest.fn(),
      })),
      add: jest.fn(),
    })),
  }),
}));

const app = express();
app.use(express.json());
app.use("/api/users", UserController);

describe("Authentication Tests", () => {
  test("User registration", async () => {
    const response = await request(app)
      .post("/api/users/register")
      .send({ username: "testuser", password: "password123" });
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("User registered successfully");
  });

  test("User login", async () => {
    const response = await request(app)
      .post("/api/users/login")
      .send({ username: "testuser", password: "password123" });
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Login successful");
  });

  test("Protected route access", async () => {
    const loginResponse = await request(app)
      .post("/api/users/login")
      .send({ username: "testuser", password: "password123" });
    const token = loginResponse.body.token;

    const response = await request(app)
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${token}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("This is a protected route");
  });
});

describe("UserModel", () => {
  let userModel;
  let mockUser;
  let mockFirestore;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Initialize UserModel
    userModel = new UserModel();

    // Mock user data
    mockUser = {
      id: "test-user-id",
      email: "test@example.com",
      displayName: "Test User",
      role: UserRole.USER,
      preferences: {
        theme: "light",
        notifications: true,
      },
    };

    // Mock Firestore responses
    mockFirestore = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockUser,
          }),
          set: jest.fn().mockResolvedValue(true),
          update: jest.fn().mockResolvedValue(true),
          delete: jest.fn().mockResolvedValue(true),
        })),
        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [
              {
                id: mockUser.id,
                data: () => mockUser,
              },
            ],
          }),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        })),
      })),
    };
  });

  describe("findByEmail", () => {
    it("should find a user by email", async () => {
      const result = await userModel.findByEmail("test@example.com");
      expect(result).toEqual({
        id: mockUser.id,
        ...mockUser,
      });
    });

    it("should throw error when user not found", async () => {
      mockFirestore
        .collection()
        .where()
        .get.mockResolvedValueOnce({ empty: true });
      await expect(
        userModel.findByEmail("nonexistent@example.com")
      ).rejects.toThrow("User not found");
    });
  });

  describe("updateRole", () => {
    it("should update user role successfully", async () => {
      const newRole = UserRole.ADMIN;
      await userModel.updateRole(mockUser.id, newRole);
      expect(mockFirestore.collection().doc().update).toHaveBeenCalledWith({
        role: newRole,
      });
    });

    it("should throw error for invalid role", async () => {
      await expect(
        userModel.updateRole(mockUser.id, "INVALID_ROLE")
      ).rejects.toThrow("Invalid role");
    });
  });

  describe("updatePreferences", () => {
    it("should update user preferences successfully", async () => {
      const newPreferences = {
        theme: "dark",
        notifications: false,
      };
      await userModel.updatePreferences(mockUser.id, newPreferences);
      expect(mockFirestore.collection().doc().update).toHaveBeenCalledWith({
        preferences: newPreferences,
      });
    });
  });

  describe("searchUsers", () => {
    it("should search users by display name", async () => {
      const query = "Test";
      const results = await userModel.searchUsers(query);
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: mockUser.id,
        ...mockUser,
      });
    });

    it("should return empty array when no users found", async () => {
      mockFirestore.collection().where().get.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });
      const results = await userModel.searchUsers("Nonexistent");
      expect(results).toHaveLength(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle Firestore errors gracefully", async () => {
      const error = new Error("Firestore error");
      mockFirestore.collection().where().get.mockRejectedValueOnce(error);

      await expect(userModel.findByEmail("test@example.com")).rejects.toThrow(
        "Failed to find user by email: Firestore error"
      );
    });
  });
});
