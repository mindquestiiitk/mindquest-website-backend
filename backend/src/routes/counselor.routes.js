import { Router } from "express";
import { CounselorController } from "../controllers/counselor.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { UserRole } from "../services/auth.service.js";

const router = Router();
const counselorController = new CounselorController();

router.post(
  "/:userId",
  authenticate,
  authorize([UserRole.ADMIN]),
  counselorController.createCounselor.bind(counselorController)
);

router.put(
  "/availability/:userId",
  authenticate,
  authorize([UserRole.COUNSELOR]),
  counselorController.updateAvailability.bind(counselorController)
);

router.put(
  "/rating/:userId",
  authenticate,
  counselorController.updateRating.bind(counselorController)
);

router.get(
  "/search",
  authenticate,
  counselorController.searchCounselors.bind(counselorController)
);

router.get(
  "/available",
  authenticate,
  counselorController.getAvailableCounselors.bind(counselorController)
);

export default router;
