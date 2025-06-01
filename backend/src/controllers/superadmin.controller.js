/**
 * Superadmin controller
 * Handles HTTP requests related to superadmin operations
 */
import { authService } from "../services/auth.service.js";
import { catchAsync } from "../utils/error.js";
import { successResponse } from "../utils/response.js";
import logger from "../utils/logger.js";
import { AppError } from "../utils/error.js";
import { db } from "../config/firebase.config.js";

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
      throw new AppError(
        400,
        "Cannot remove yourself as superadmin",
        "self_removal_not_allowed"
      );
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

    successResponse(
      res,
      result,
      "User removed from superadmin role successfully"
    );
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

    const superadminsSnapshot =
      await this.authService.superadminsCollection.get();

    const superadmins = superadminsSnapshot.docs.map((doc) => ({
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

    successResponse(
      res,
      { userId, isSuperAdmin },
      "Superadmin check completed"
    );
  });

  /**
   * Get all users with pagination and filtering
   * @route GET /superadmin/users
   */
  getAllUsers = catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      role,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    logger.info("Fetching all users", {
      requestedBy: req.user.id,
      filters: { page, limit, role, search, sortBy, sortOrder },
      path: req.path,
      method: req.method,
    });

    try {
      // Build Firestore query
      let query = db.collection("users");

      // Apply role filter if specified
      if (role && role !== "all") {
        query = query.where("role", "==", role);
      }

      // For search, we need to handle it differently since Firestore has limitations
      // We'll fetch all users and filter client-side for search functionality
      let allUsers = [];
      let total = 0;

      if (search) {
        // If search is specified, we need to get all users and filter client-side
        const allSnapshot = await query.get();
        const searchLower = search.toLowerCase();

        allSnapshot.forEach((doc) => {
          const userData = doc.data();
          const email = (userData.email || "").toLowerCase();
          const name = (
            userData.name ||
            userData.displayName ||
            ""
          ).toLowerCase();

          // Check if search term matches email or name
          if (email.includes(searchLower) || name.includes(searchLower)) {
            allUsers.push({
              id: doc.id,
              ...userData,
              // Remove sensitive data
              password: undefined,
              refreshTokens: undefined,
            });
          }
        });

        total = allUsers.length;

        // Apply sorting to filtered results
        allUsers.sort((a, b) => {
          const aValue = a[sortBy] || "";
          const bValue = b[sortBy] || "";

          if (sortOrder === "asc") {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });

        // Apply pagination to filtered and sorted results
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;

        allUsers = allUsers.slice(startIndex, endIndex);
      } else {
        // No search, use Firestore query with sorting and pagination
        const sortDirection = sortOrder === "asc" ? "asc" : "desc";
        query = query.orderBy(sortBy, sortDirection);

        // Get total count for pagination
        const totalSnapshot = await query.get();
        total = totalSnapshot.size;

        // Apply pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        query = query.offset(offset).limit(limitNum);

        // Execute query
        const snapshot = await query.get();

        snapshot.forEach((doc) => {
          const userData = doc.data();
          allUsers.push({
            id: doc.id,
            ...userData,
            // Remove sensitive data
            password: undefined,
            refreshTokens: undefined,
          });
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const pagination = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      };

      logger.info("Users fetched successfully", {
        count: allUsers.length,
        total,
        requestedBy: req.user.id,
      });

      successResponse(
        res,
        { users: allUsers, pagination },
        "Users retrieved successfully"
      );
    } catch (error) {
      logger.error("Error fetching users", {
        error: error.message,
        requestedBy: req.user.id,
      });
      throw new AppError(500, "Failed to fetch users", "fetch_users_error");
    }
  });

  /**
   * Get all admins and superadmins
   * @route GET /superadmin/admins
   */
  getAllAdmins = catchAsync(async (req, res) => {
    logger.info("Fetching all admins and superadmins", {
      requestedBy: req.user.id,
      path: req.path,
      method: req.method,
    });

    try {
      // Get users with admin role
      const adminUsersQuery = db
        .collection("users")
        .where("role", "==", "admin");
      const adminUsersSnapshot = await adminUsersQuery.get();

      const adminUsers = [];
      adminUsersSnapshot.forEach((doc) => {
        const userData = doc.data();
        adminUsers.push({
          id: doc.id,
          ...userData,
          type: "admin",
          password: undefined,
          refreshTokens: undefined,
        });
      });

      // Get superadmins
      const superadminsSnapshot = await db.collection("superadmins").get();
      const superadmins = [];
      superadminsSnapshot.forEach((doc) => {
        const superadminData = doc.data();
        superadmins.push({
          id: doc.id,
          ...superadminData,
          type: "superadmin",
        });
      });

      const result = {
        admins: adminUsers,
        superadmins: superadmins,
        total: adminUsers.length + superadmins.length,
      };

      logger.info("Admins and superadmins fetched successfully", {
        adminCount: adminUsers.length,
        superadminCount: superadmins.length,
        requestedBy: req.user.id,
      });

      successResponse(
        res,
        result,
        "Admins and superadmins retrieved successfully"
      );
    } catch (error) {
      logger.error("Error fetching admins", {
        error: error.message,
        requestedBy: req.user.id,
      });
      throw new AppError(500, "Failed to fetch admins", "fetch_admins_error");
    }
  });

  /**
   * Promote user to admin
   * @route POST /superadmin/promote-admin
   */
  promoteToAdmin = catchAsync(async (req, res) => {
    const { userId, permissions = [] } = req.body;

    if (!userId) {
      throw new AppError(400, "User ID is required", "missing_user_id");
    }

    logger.info("Promoting user to admin", {
      userId,
      permissions,
      promotedBy: req.user.id,
      path: req.path,
      method: req.method,
    });

    try {
      // Check if user exists
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new AppError(404, "User not found", "user_not_found");
      }

      const userData = userDoc.data();

      // Check if user is already an admin
      if (userData.role === "admin" || userData.role === "superadmin") {
        throw new AppError(400, "User is already an admin", "already_admin");
      }

      // Use transaction to ensure consistency
      await db.runTransaction(async (transaction) => {
        // Update user role in users collection
        transaction.update(db.collection("users").doc(userId), {
          role: "admin",
          promotedAt: new Date(),
          promotedBy: req.user.id,
          updatedAt: new Date(),
        });

        // Add to admins collection for collection-based security
        transaction.set(db.collection("admins").doc(userId), {
          userId,
          email: userData.email,
          name: userData.name || userData.displayName,
          permissions:
            permissions.length > 0
              ? permissions
              : ["manage_users", "manage_content", "view_analytics"],
          addedBy: req.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      logger.info("User promoted to admin successfully", {
        userId,
        promotedBy: req.user.id,
      });

      successResponse(
        res,
        { userId, role: "admin" },
        "User promoted to admin successfully"
      );
    } catch (error) {
      logger.error("Error promoting user to admin", {
        error: error.message,
        userId,
        promotedBy: req.user.id,
      });

      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        500,
        "Failed to promote user to admin",
        "promote_admin_error"
      );
    }
  });

  /**
   * Demote admin to user
   * @route POST /superadmin/demote-admin
   */
  demoteAdmin = catchAsync(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
      throw new AppError(400, "User ID is required", "missing_user_id");
    }

    // Prevent demoting yourself
    if (userId === req.user.id) {
      throw new AppError(
        400,
        "Cannot demote yourself",
        "self_demotion_not_allowed"
      );
    }

    logger.info("Demoting admin to user", {
      userId,
      demotedBy: req.user.id,
      path: req.path,
      method: req.method,
    });

    try {
      // Check if user exists and is an admin
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new AppError(404, "User not found", "user_not_found");
      }

      const userData = userDoc.data();

      // Check if user is a superadmin (cannot demote superadmins)
      if (userData.role === "superadmin") {
        throw new AppError(
          400,
          "Cannot demote superadmin",
          "cannot_demote_superadmin"
        );
      }

      // Check if user is actually an admin
      if (userData.role !== "admin") {
        throw new AppError(400, "User is not an admin", "not_admin");
      }

      // Use transaction to ensure consistency
      await db.runTransaction(async (transaction) => {
        // Update user role in users collection
        transaction.update(db.collection("users").doc(userId), {
          role: "user",
          demotedAt: new Date(),
          demotedBy: req.user.id,
          updatedAt: new Date(),
        });

        // Remove from admins collection
        transaction.delete(db.collection("admins").doc(userId));
      });

      logger.info("Admin demoted to user successfully", {
        userId,
        demotedBy: req.user.id,
      });

      successResponse(
        res,
        { userId, role: "user" },
        "Admin demoted to user successfully"
      );
    } catch (error) {
      logger.error("Error demoting admin", {
        error: error.message,
        userId,
        demotedBy: req.user.id,
      });

      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, "Failed to demote admin", "demote_admin_error");
    }
  });

  /**
   * Update user permissions
   * @route PUT /superadmin/user-permissions
   */
  updateUserPermissions = catchAsync(async (req, res) => {
    const { userId, permissions } = req.body;

    if (!userId) {
      throw new AppError(400, "User ID is required", "missing_user_id");
    }

    if (!Array.isArray(permissions)) {
      throw new AppError(
        400,
        "Permissions must be an array",
        "invalid_permissions"
      );
    }

    logger.info("Updating user permissions", {
      userId,
      permissions,
      updatedBy: req.user.id,
      path: req.path,
      method: req.method,
    });

    try {
      // Check if user exists and is an admin
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new AppError(404, "User not found", "user_not_found");
      }

      const userData = userDoc.data();

      // Only admins can have permissions updated (not regular users or superadmins)
      if (userData.role !== "admin") {
        throw new AppError(
          400,
          "Can only update permissions for admin users",
          "not_admin"
        );
      }

      // Update permissions in admins collection
      await db.collection("admins").doc(userId).update({
        permissions,
        updatedAt: new Date(),
        updatedBy: req.user.id,
      });

      logger.info("User permissions updated successfully", {
        userId,
        permissions,
        updatedBy: req.user.id,
      });

      successResponse(
        res,
        { userId, permissions },
        "User permissions updated successfully"
      );
    } catch (error) {
      logger.error("Error updating user permissions", {
        error: error.message,
        userId,
        updatedBy: req.user.id,
      });

      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        500,
        "Failed to update user permissions",
        "update_permissions_error"
      );
    }
  });

  /**
   * Delete user (soft delete)
   * @route DELETE /superadmin/user/:userId
   */
  deleteUser = catchAsync(async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
      throw new AppError(400, "User ID is required", "missing_user_id");
    }

    // Prevent deleting yourself
    if (userId === req.user.id) {
      throw new AppError(
        400,
        "Cannot delete yourself",
        "self_deletion_not_allowed"
      );
    }

    logger.info("Deleting user", {
      userId,
      deletedBy: req.user.id,
      path: req.path,
      method: req.method,
    });

    try {
      // Check if user exists
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new AppError(404, "User not found", "user_not_found");
      }

      const userData = userDoc.data();

      // Prevent deleting superadmins
      if (userData.role === "superadmin") {
        throw new AppError(
          400,
          "Cannot delete superadmin",
          "cannot_delete_superadmin"
        );
      }

      // Use transaction to ensure consistency
      await db.runTransaction(async (transaction) => {
        // Soft delete user (mark as deleted instead of actually deleting)
        transaction.update(db.collection("users").doc(userId), {
          deleted: true,
          deletedAt: new Date(),
          deletedBy: req.user.id,
          updatedAt: new Date(),
        });

        // If user is an admin, remove from admins collection
        if (userData.role === "admin") {
          transaction.delete(db.collection("admins").doc(userId));
        }
      });

      logger.info("User deleted successfully", {
        userId,
        deletedBy: req.user.id,
      });

      successResponse(
        res,
        { userId, deleted: true },
        "User deleted successfully"
      );
    } catch (error) {
      logger.error("Error deleting user", {
        error: error.message,
        userId,
        deletedBy: req.user.id,
      });

      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, "Failed to delete user", "delete_user_error");
    }
  });
}

// Export singleton instance
export const superadminController = new SuperadminController();
