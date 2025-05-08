import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { UserRole } from "../services/auth.service.js";

const router = Router();
const adminController = new AdminController();

router.get(
  "/stats",
  authenticate,
  authorize([UserRole.ADMIN]),
  adminController.getSystemStats.bind(adminController)
);

router.get(
  "/users/count",
  authenticate,
  authorize([UserRole.ADMIN]),
  adminController.getUserCount.bind(adminController)
);

router.get(
  "/counselors/count",
  authenticate,
  authorize([UserRole.ADMIN]),
  adminController.getCounselorCount.bind(adminController)
);

router.get(
  "/messages/count",
  authenticate,
  authorize([UserRole.ADMIN]),
  adminController.getMessageCount.bind(adminController)
);

export default router;
