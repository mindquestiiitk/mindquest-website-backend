import { AdminService } from "../services/admin.service.js";

export class AdminController {
  constructor() {
    this.adminService = new AdminService();
  }

  async getSystemStats(req, res) {
    try {
      const stats = await this.adminService.getSystemStats();
      res.status(200).json({
        success: true,
        data: stats,
        message: "System stats retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getUserCount(req, res) {
    try {
      const count = await this.adminService.getUserCount();
      res.status(200).json({
        success: true,
        data: { count },
        message: "User count retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getCounselorCount(req, res) {
    try {
      const count = await this.adminService.getCounselorCount();
      res.status(200).json({
        success: true,
        data: { count },
        message: "Counselor count retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getMessageCount(req, res) {
    try {
      const count = await this.adminService.getMessageCount();
      res.status(200).json({
        success: true,
        data: { count },
        message: "Message count retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}
