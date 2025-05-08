import { UserController } from "../src/controllers/user.controller.js";
import { UserService } from "../src/services/user.service.js";

jest.mock("../src/services/user.service.js");

describe("UserController", () => {
  let userController;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    userController = new UserController();
    mockReq = {
      body: {},
      params: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe("getUserProfile", () => {
    it("should get user profile successfully", async () => {
      const mockProfile = {
        id: "123",
        email: "test@example.com",
        displayName: "Test User",
        role: "user",
      };
      mockReq.params = { userId: "123" };

      UserService.prototype.getUserProfile.mockResolvedValue(mockProfile);

      await userController.getUserProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockProfile,
        message: "User profile retrieved successfully",
      });
    });

    it("should handle user not found error", async () => {
      mockReq.params = { userId: "nonexistent" };

      UserService.prototype.getUserProfile.mockRejectedValue(
        new Error("User not found")
      );

      await userController.getUserProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "User not found",
      });
    });
  });

  describe("updateUserProfile", () => {
    it("should update user profile successfully", async () => {
      const mockProfile = {
        id: "123",
        email: "test@example.com",
        displayName: "Updated Name",
        role: "user",
      };
      mockReq.params = { userId: "123" };
      mockReq.body = { displayName: "Updated Name" };

      UserService.prototype.updateUserProfile.mockResolvedValue(mockProfile);

      await userController.updateUserProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockProfile,
        message: "User profile updated successfully",
      });
    });

    it("should handle profile update error", async () => {
      mockReq.params = { userId: "123" };
      mockReq.body = { displayName: "Updated Name" };

      UserService.prototype.updateUserProfile.mockRejectedValue(
        new Error("Failed to update profile")
      );

      await userController.updateUserProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to update profile",
      });
    });
  });

  describe("searchUsers", () => {
    it("should search users successfully", async () => {
      const mockUsers = [
        {
          id: "123",
          email: "test@example.com",
          displayName: "Test User",
        },
      ];
      mockReq.query = { query: "test" };

      UserService.prototype.searchUsers.mockResolvedValue(mockUsers);

      await userController.searchUsers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers,
        message: "Users search completed successfully",
      });
    });

    it("should handle search error", async () => {
      mockReq.query = { query: "test" };

      UserService.prototype.searchUsers.mockRejectedValue(
        new Error("Search failed")
      );

      await userController.searchUsers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Search failed",
      });
    });
  });

  describe("deleteUser", () => {
    it("should delete user successfully", async () => {
      mockReq.params = { userId: "123" };

      UserService.prototype.deleteUser.mockResolvedValue();

      await userController.deleteUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "User deleted successfully",
      });
    });

    it("should handle delete error", async () => {
      mockReq.params = { userId: "123" };

      UserService.prototype.deleteUser.mockRejectedValue(
        new Error("Failed to delete user")
      );

      await userController.deleteUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to delete user",
      });
    });
  });
});
