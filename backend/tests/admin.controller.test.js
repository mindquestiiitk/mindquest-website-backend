import { AdminController } from "../src/controllers/admin.controller.js";
import { AdminService } from "../src/services/admin.service.js";

jest.mock("../src/services/admin.service.js");

describe("AdminController", () => {
  let adminController;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    adminController = new AdminController();
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

  describe("getSystemStats", () => {
    it("should get system stats successfully", async () => {
      const mockStats = {
        totalUsers: 100,
        totalCounselors: 20,
        totalMessages: 500,
        timestamp: "2024-03-20T10:00:00Z",
      };

      AdminService.prototype.getSystemStats.mockResolvedValue(mockStats);

      await adminController.getSystemStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
        message: "System stats retrieved successfully",
      });
    });

    it("should handle system stats error", async () => {
      AdminService.prototype.getSystemStats.mockRejectedValue(
        new Error("Failed to get system stats")
      );

      await adminController.getSystemStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to get system stats",
      });
    });
  });

  describe("getUserCount", () => {
    it("should get user count successfully", async () => {
      const mockCount = 100;

      AdminService.prototype.getUserCount.mockResolvedValue(mockCount);

      await adminController.getUserCount(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { count: mockCount },
        message: "User count retrieved successfully",
      });
    });

    it("should handle user count error", async () => {
      AdminService.prototype.getUserCount.mockRejectedValue(
        new Error("Failed to get user count")
      );

      await adminController.getUserCount(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to get user count",
      });
    });
  });

  describe("getCounselorCount", () => {
    it("should get counselor count successfully", async () => {
      const mockCount = 20;

      AdminService.prototype.getCounselorCount.mockResolvedValue(mockCount);

      await adminController.getCounselorCount(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { count: mockCount },
        message: "Counselor count retrieved successfully",
      });
    });

    it("should handle counselor count error", async () => {
      AdminService.prototype.getCounselorCount.mockRejectedValue(
        new Error("Failed to get counselor count")
      );

      await adminController.getCounselorCount(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to get counselor count",
      });
    });
  });

  describe("getMessageCount", () => {
    it("should get message count successfully", async () => {
      const mockCount = 500;

      AdminService.prototype.getMessageCount.mockResolvedValue(mockCount);

      await adminController.getMessageCount(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { count: mockCount },
        message: "Message count retrieved successfully",
      });
    });

    it("should handle message count error", async () => {
      AdminService.prototype.getMessageCount.mockRejectedValue(
        new Error("Failed to get message count")
      );

      await adminController.getMessageCount(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to get message count",
      });
    });
  });
});
