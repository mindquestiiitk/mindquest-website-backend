import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();
const userController = new UserController();

// All routes require authentication
router.use(authenticate);

router.get(
  "/profile/:userId",
  userController.getUserProfile.bind(userController)
);

router.put(
  "/profile/:userId",
  userController.updateUserProfile.bind(userController)
);

router.put("/preferences", async (req, res) => {
  try {
    const profile = await userController.updateUserPreferences(
      req.user.uid,
      req.body
    );
    res.json(profile);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:userId", userController.deleteUser.bind(userController));

router.get("/search", userController.searchUsers.bind(userController));

export default router;
