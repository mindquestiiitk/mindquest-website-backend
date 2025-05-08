import { CounselorController } from "../src/controllers/counselor.controller.js";
import { CounselorService } from "../src/services/counselor.service.js";

jest.mock("../src/services/counselor.service.js");

describe("CounselorController", () => {
  let counselorController;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    counselorController = new CounselorController();
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

  describe("createCounselor", () => {
    it("should create counselor profile successfully", async () => {
      const mockCounselor = {
        id: "123",
        userId: "123",
        specialties: ["Anxiety", "Depression"],
        rating: 0,
        totalRatings: 0,
      };
      mockReq.params = { userId: "123" };
      mockReq.body = {
        specialties: ["Anxiety", "Depression"],
      };

      CounselorService.prototype.createCounselor.mockResolvedValue(
        mockCounselor
      );

      await counselorController.createCounselor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCounselor,
        message: "Counselor profile created successfully",
      });
    });

    it("should handle counselor creation error", async () => {
      mockReq.params = { userId: "123" };
      mockReq.body = {
        specialties: ["Anxiety", "Depression"],
      };

      CounselorService.prototype.createCounselor.mockRejectedValue(
        new Error("Failed to create counselor")
      );

      await counselorController.createCounselor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to create counselor",
      });
    });
  });

  describe("updateAvailability", () => {
    it("should update availability successfully", async () => {
      const availability = {
        monday: { start: "09:00", end: "17:00" },
        tuesday: { start: "09:00", end: "17:00" },
      };
      mockReq.params = { userId: "123" };
      mockReq.body = { availability };

      CounselorService.prototype.updateAvailability.mockResolvedValue();

      await counselorController.updateAvailability(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Availability updated successfully",
      });
    });

    it("should handle availability update error", async () => {
      mockReq.params = { userId: "123" };
      mockReq.body = { availability: {} };

      CounselorService.prototype.updateAvailability.mockRejectedValue(
        new Error("Failed to update availability")
      );

      await counselorController.updateAvailability(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to update availability",
      });
    });
  });

  describe("updateRating", () => {
    it("should update rating successfully", async () => {
      mockReq.params = { userId: "123" };
      mockReq.body = { rating: 4.5 };

      CounselorService.prototype.updateRating.mockResolvedValue();

      await counselorController.updateRating(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Rating updated successfully",
      });
    });

    it("should handle rating update error", async () => {
      mockReq.params = { userId: "123" };
      mockReq.body = { rating: 6 }; // Invalid rating

      CounselorService.prototype.updateRating.mockRejectedValue(
        new Error("Failed to update rating")
      );

      await counselorController.updateRating(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to update rating",
      });
    });
  });

  describe("searchCounselors", () => {
    it("should search counselors successfully", async () => {
      const mockCounselors = [
        {
          id: "123",
          userId: "123",
          specialties: ["Anxiety"],
          rating: 4.5,
        },
      ];
      mockReq.query = { query: "Anxiety" };

      CounselorService.prototype.searchCounselors.mockResolvedValue(
        mockCounselors
      );

      await counselorController.searchCounselors(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCounselors,
        message: "Counselors search completed successfully",
      });
    });

    it("should handle search error", async () => {
      mockReq.query = { query: "Anxiety" };

      CounselorService.prototype.searchCounselors.mockRejectedValue(
        new Error("Search failed")
      );

      await counselorController.searchCounselors(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Search failed",
      });
    });
  });

  describe("getAvailableCounselors", () => {
    it("should get available counselors successfully", async () => {
      const mockCounselors = [
        {
          id: "123",
          userId: "123",
          isAvailable: true,
        },
      ];

      CounselorService.prototype.getAvailableCounselors.mockResolvedValue(
        mockCounselors
      );

      await counselorController.getAvailableCounselors(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCounselors,
        message: "Available counselors retrieved successfully",
      });
    });

    it("should handle get available counselors error", async () => {
      CounselorService.prototype.getAvailableCounselors.mockRejectedValue(
        new Error("Failed to get available counselors")
      );

      await counselorController.getAvailableCounselors(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to get available counselors",
      });
    });
  });
});
