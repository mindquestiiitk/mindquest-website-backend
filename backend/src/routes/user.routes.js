import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";
import { clientAuthMiddleware } from "../middleware/client-auth.middleware.js";

const router = Router();
const userController = new UserController();

// All routes require authentication
router.use(clientAuthMiddleware);

router.get(
  "/profile/:userId",
  userController.getUserProfile.bind(userController)
);

router.put(
  "/profile/:userId",
  userController.updateUserProfile.bind(userController)
);

router.put(
  "/preferences",
  userController.updateUserPreferences.bind(userController)
);

// Professional REST endpoints - Clean dedicated endpoints
// Get user profile (basic data only)
// Security: Requires authentication and authorization
router.get(
  "/:userId/profile",
  userController.getUserProfile.bind(userController)
);

// Get complete user data (profile + preferences + settings)
// Security: Requires authentication and authorization
router.get(
  "/:userId/complete",
  userController.getCompleteUserProfile.bind(userController)
);

// Update user profile with multiple fields
// Security: Requires authentication and authorization
router.put("/:userId", userController.updateUserProfile.bind(userController));

// Legacy endpoints removed - use dedicated endpoints instead

router.delete("/:userId", userController.deleteUser.bind(userController));

router.get("/search", userController.searchUsers.bind(userController));

export default router;
