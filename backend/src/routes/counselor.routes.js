import { Router } from "express";
import { CounselorController } from "../controllers/counselor.controller.js";
import {
  clientAuthMiddleware,
  clientAuthorize,
} from "../middleware/client-auth.middleware.js";
import { UserRole } from "../services/auth.service.js";

const router = Router();
const counselorController = new CounselorController();

router.post(
  "/:userId",
  clientAuthMiddleware,
  clientAuthorize([UserRole.ADMIN]),
  counselorController.createCounselor.bind(counselorController)
);

router.put(
  "/availability/:userId",
  clientAuthMiddleware,
  clientAuthorize([UserRole.COUNSELOR]),
  counselorController.updateAvailability.bind(counselorController)
);

router.put(
  "/rating/:userId",
  clientAuthMiddleware,
  counselorController.updateRating.bind(counselorController)
);

router.get(
  "/search",
  clientAuthMiddleware,
  counselorController.searchCounselors.bind(counselorController)
);

router.get(
  "/available",
  clientAuthMiddleware,
  counselorController.getAvailableCounselors.bind(counselorController)
);

export default router;
