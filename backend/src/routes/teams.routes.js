/**
 * Teams routes
 * Handles routes related to team members
 */
import express from "express";
import { TeamsController } from "../controllers/teams.controller.js";
import {
  authMiddleware,
  authorizeAdmin,
} from "../middleware/auth.middleware.js";
import logger from "../utils/logger.js";

const router = express.Router();
const teamsController = new TeamsController();

// Log all teams route access
router.use((req, res, next) => {
  logger.info(`Teams route accessed: ${req.method} ${req.path}`, {
    userId: req.user?.id,
    ip: req.ip,
  });
  next();
});

// Public routes
// Get all team members
router.get("/", teamsController.getAllTeamMembers);

// Get team members by type - must come before /:id to avoid conflict
router.get("/type/:type", teamsController.getTeamMembersByType);

// Get team members by batch - must come before /:id to avoid conflict
router.get("/batch/:batch", teamsController.getTeamMembersByBatch);

// Get team member by ID
router.get("/:id", teamsController.getTeamMemberById);

// Protected routes
// Seed teams (admin only)
router.post("/seed", authMiddleware, authorizeAdmin, teamsController.seedTeams);

export default router;
