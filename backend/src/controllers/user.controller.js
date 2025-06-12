import { UserService } from "../services/user.service.js";

export class UserController {
  constructor() {
    this.userService = new UserService();
  }

  /**
   * Get user profile (basic data only)
   * @route GET /users/:userId/profile
   */
  async getUserProfile(req, res) {
    try {
      const { userId } = req.params;
      const requestingUser = req.user; // From authentication middleware

      // Security: Authorization check - users can only access their own data or admins can access any
      if (
        requestingUser.id !== userId &&
        requestingUser.role !== "admin" &&
        requestingUser.role !== "superadmin"
      ) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You can only access your own profile.",
          code: "access_denied",
        });
      }

      // Security: Validate userId parameter
      if (!userId || typeof userId !== "string" || userId.length > 50) {
        return res.status(400).json({
          success: false,
          error: "Invalid user ID parameter",
          code: "invalid_user_id",
        });
      }

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

  /**
   * Get complete user profile (profile + preferences + settings)
   * @route GET /users/:userId/complete
   */
  async getCompleteUserProfile(req, res) {
    try {
      const { userId } = req.params;
      const requestingUser = req.user; // From authentication middleware

      // Security: Authorization check - users can only access their own data or admins can access any
      if (
        requestingUser.id !== userId &&
        requestingUser.role !== "admin" &&
        requestingUser.role !== "superadmin"
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Access denied. You can only access your own complete profile.",
          code: "access_denied",
        });
      }

      // Security: Validate userId parameter
      if (!userId || typeof userId !== "string" || userId.length > 50) {
        return res.status(400).json({
          success: false,
          error: "Invalid user ID parameter",
          code: "invalid_user_id",
        });
      }

      // Get complete user data with all fields
      const [profile, preferences, settings] = await Promise.all([
        this.userService.getUserProfile(userId),
        this.userService.getUserPreferences(userId).catch(() => null),
        this.userService.getUserSettings(userId).catch(() => null),
      ]);

      const userData = {
        profile,
        preferences: preferences || {},
        settings: settings || {},
      };

      res.status(200).json({
        success: true,
        data: userData,
        message: "Complete user profile retrieved successfully",
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

  // Legacy method removed - use getCompleteUserProfile instead

  // Legacy method removed - use updateUserProfile instead

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
