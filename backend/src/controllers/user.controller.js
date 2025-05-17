import { UserService } from "../services/user.service.js";

export class UserController {
  constructor() {
    this.userService = new UserService();
  }

  async getUserProfile(req, res) {
    try {
      const { userId } = req.params;
      const profile = await this.userService.getUserProfile(userId);
      res.status(200).json({
        success: true,
        data: profile,
        message: "User profile retrieved successfully",
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
    }
  }

  async updateUserProfile(req, res) {
    try {
      const { userId } = req.params;
      const updateData = req.body;
      const updatedProfile = await this.userService.updateUserProfile(
        userId,
        updateData
      );
      res.status(200).json({
        success: true,
        data: updatedProfile,
        message: "User profile updated successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async searchUsers(req, res) {
    try {
      const { query } = req.query;
      const users = await this.userService.searchUsers(query);
      res.status(200).json({
        success: true,
        data: users,
        message: "Users search completed successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async updateUserPreferences(req, res) {
    try {
      const userId = req.user.uid;
      const preferences = req.body;
      const profile = await this.userService.updateUserPreferences(
        userId,
        preferences
      );
      res.status(200).json({
        success: true,
        data: profile,
        message: "User preferences updated successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      await this.userService.deleteUser(userId);
      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}
