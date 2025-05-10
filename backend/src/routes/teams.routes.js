import express from "express";
import { TeamsController } from "../controllers/teams.controller.js";

const router = express.Router();
const teamsController = new TeamsController();

// Get all team members
router.get("/", teamsController.getAllTeamMembers.bind(teamsController));

// Get team member by ID
router.get("/:id", teamsController.getTeamMemberById.bind(teamsController));

// Get team members by type
router.get("/type/:type", teamsController.getTeamMembersByType.bind(teamsController));

// Get team members by batch
router.get("/batch/:batch", teamsController.getTeamMembersByBatch.bind(teamsController));

// Seed teams (admin only)
router.post("/seed", teamsController.seedTeams.bind(teamsController));

export default router;
