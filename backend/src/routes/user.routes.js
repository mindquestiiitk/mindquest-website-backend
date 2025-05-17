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

router.delete("/:userId", userController.deleteUser.bind(userController));

router.get("/search", userController.searchUsers.bind(userController));

export default router;
