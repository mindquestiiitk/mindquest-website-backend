/**
 * Superadmin controller
 * Handles HTTP requests related to superadmin operations
 */
import { authService } from "../services/auth.service.js";
import { catchAsync } from "../utils/error.js";
import { successResponse } from "../utils/response.js";
import logger from "../utils/logger.js";
import { AppError } from "../utils/error.js";

export class SuperadminController {
  constructor() {
    this.authService = authService;
  }

  /**
   * Add a user as superadmin
   * @route POST /superadmin/add
   */
  addSuperAdmin = catchAsync(async (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
      throw new AppError(400, "User ID is required", "missing_user_id");
    }
    
    logger.info("Adding user as superadmin", {
      userId,
      addedBy: req.user.id,
      path: req.path,
      method: req.method,
    });
    
    const result = await this.authService.addSuperAdmin(userId, req.user.id);
    
    logger.info("User added as superadmin successfully", {
      userId,
      addedBy: req.user.id,
    });
    
    successResponse(res, result, "User added as superadmin successfully");
  });
  
  /**
   * Remove a user from superadmin role
   * @route POST /superadmin/remove
   */
  removeSuperAdmin = catchAsync(async (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
      throw new AppError(400, "User ID is required", "missing_user_id");
    }
    
    // Prevent removing yourself as a superadmin
    if (userId === req.user.id) {
      throw new AppError(400, "Cannot remove yourself as superadmin", "self_removal_not_allowed");
    }
    
    logger.info("Removing user from superadmin role", {
      userId,
      removedBy: req.user.id,
      path: req.path,
      method: req.method,
    });
    
    const result = await this.authService.removeSuperAdmin(userId, req.user.id);
    
    logger.info("User removed from superadmin role successfully", {
      userId,
      removedBy: req.user.id,
    });
    
    successResponse(res, result, "User removed from superadmin role successfully");
  });
  
  /**
   * List all superadmins
   * @route GET /superadmin/list
   */
  listSuperAdmins = catchAsync(async (req, res) => {
    logger.info("Listing all superadmins", {
      requestedBy: req.user.id,
      path: req.path,
      method: req.method,
    });
    
    const superadminsSnapshot = await this.authService.superadminsCollection.get();
    
    const superadmins = superadminsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    successResponse(res, superadmins, "Superadmins retrieved successfully");
  });
  
  /**
   * Check if a user is a superadmin
   * @route GET /superadmin/check/:userId
   */
  checkSuperAdmin = catchAsync(async (req, res) => {
    const { userId } = req.params;
    
    if (!userId) {
      throw new AppError(400, "User ID is required", "missing_user_id");
    }
    
    logger.info("Checking if user is superadmin", {
      userId,
      requestedBy: req.user.id,
      path: req.path,
      method: req.method,
    });
    
    const isSuperAdmin = await this.authService.isUserSuperAdmin(userId);
    
    successResponse(res, { userId, isSuperAdmin }, "Superadmin check completed");
  });
}

// Export singleton instance
export const superadminController = new SuperadminController();
