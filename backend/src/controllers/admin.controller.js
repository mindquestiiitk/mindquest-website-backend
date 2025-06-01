/**
 * Admin controller
 * Handles HTTP requests related to admin operations
 */
import { AdminService } from "../services/admin.service.js";
import { catchAsync } from "../utils/error.js";
import { successResponse } from "../utils/response.js";
import logger from "../utils/logger.js";

export class AdminController {
  constructor() {
    this.adminService = new AdminService();
  }

  /**
   * Get system statistics
   * @route GET /admin/stats
   */
  getSystemStats = catchAsync(async (req, res) => {
    logger.info("Fetching system statistics", {
      path: req.path,
      method: req.method,
    });

    const stats = await this.adminService.getSystemStats();
    logger.debug("System stats retrieved", { stats });

    successResponse(res, stats, "System stats retrieved successfully");
  });

  /**
   * Get user count
   * @route GET /admin/users/count
   */
  getUserCount = catchAsync(async (req, res) => {
    logger.info("Fetching user count", { path: req.path, method: req.method });

    const count = await this.adminService.getUserCount();
    logger.debug(`User count: ${count}`);

    successResponse(res, { count }, "User count retrieved successfully");
  });

  /**
   * Get counselor count
   * @route GET /admin/counselors/count
   */
  getCounselorCount = catchAsync(async (req, res) => {
    logger.info("Fetching counselor count", {
      path: req.path,
      method: req.method,
    });

    const count = await this.adminService.getCounselorCount();
    logger.debug(`Counselor count: ${count}`);

    successResponse(res, { count }, "Counselor count retrieved successfully");
  });

  /**
   * Get message count
   * @route GET /admin/messages/count
   */
  getMessageCount = catchAsync(async (req, res) => {
    logger.info("Fetching message count", {
      path: req.path,
      method: req.method,
    });

    const count = await this.adminService.getMessageCount();
    logger.debug(`Message count: ${count}`);

    successResponse(res, { count }, "Message count retrieved successfully");
  });

  /**
   * Get all users for admin dashboard
   * @route GET /admin/users
   */
  getAllUsers = catchAsync(async (req, res) => {
    logger.info("Fetching all users for admin dashboard", {
      requestedBy: req.user.id,
      path: req.path,
      method: req.method,
    });

    const users = await this.adminService.getAllUsers();
    logger.debug(`Retrieved ${users.length} users`);

    successResponse(res, users, "Users retrieved successfully");
  });
}
