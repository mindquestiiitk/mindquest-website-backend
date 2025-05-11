import { CounselorService } from "../services/counselor.service.js";

export class CounselorController {
  constructor() {
    this.counselorService = new CounselorService();
  }

  async createCounselor(req, res) {
    try {
      const { userId } = req.params;
      const counselorData = req.body;
      const counselor = await this.counselorService.createCounselor(
        userId,
        counselorData
      );
      res.status(201).json({
        success: true,
        data: counselor,
        message: "Counselor profile created successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async updateAvailability(req, res) {
    try {
      const { userId } = req.params;
      const { availability } = req.body;
      await this.counselorService.updateAvailability(userId, availability);
      res.status(200).json({
        success: true,
        message: "Availability updated successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async updateRating(req, res) {
    try {
      const { userId } = req.params;
      const { rating } = req.body;
      await this.counselorService.updateRating(userId, rating);
      res.status(200).json({
        success: true,
        message: "Rating updated successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async searchCounselors(req, res) {
    try {
      const { query } = req.query;
      const counselors = await this.counselorService.searchCounselors(query);
      res.status(200).json({
        success: true,
        data: counselors,
        message: "Counselors search completed successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getAvailableCounselors(req, res) {
    try {
      const counselors = await this.counselorService.getAvailableCounselors();
      res.status(200).json({
        success: true,
        data: counselors,
        message: "Available counselors retrieved successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}
