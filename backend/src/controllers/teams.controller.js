/**
 * Teams controller
 * Handles HTTP requests related to team members
 */
import { TeamsService } from "../services/teams.service.js";
import { catchAsync } from "../utils/error.js";
import { successResponse, notFoundResponse } from "../utils/response.js";
import logger from "../utils/logger.js";

export class TeamsController {
  constructor() {
    this.teamsService = new TeamsService();
  }

  /**
   * Get all team members
   * @route GET /teams
   */
  getAllTeamMembers = catchAsync(async (req, res) => {
    logger.info("Fetching all team members", {
      path: req.path,
      method: req.method,
    });

    const teamMembers = await this.teamsService.getAllTeamMembers();
    logger.debug(`Found ${teamMembers.length} team members`);

    // Log sample data in development
    if (teamMembers.length > 0) {
      logger.debug("Sample team member data", {
        sampleMember: teamMembers[0],
        count: teamMembers.length,
      });
    }

    // Use standardized response format
    successResponse(res, teamMembers, "Team members retrieved successfully");
  });

  /**
   * Get team member by ID
   * @route GET /teams/:id
   */
  getTeamMemberById = catchAsync(async (req, res) => {
    const { id } = req.params;
    logger.info(`Fetching team member by ID: ${id}`, {
      path: req.path,
      method: req.method,
    });

    const member = await this.teamsService.getTeamMemberById(id);

    if (!member) {
      logger.warn(`Team member not found: ${id}`);
      return notFoundResponse(res, "Team member not found");
    }

    logger.debug(`Team member found: ${id}`);
    // Use standardized response format
    successResponse(res, member, "Team member retrieved successfully");
  });

  /**
   * Get team members by type
   * @route GET /teams/type/:type
   */
  getTeamMembersByType = catchAsync(async (req, res) => {
    const { type } = req.params;
    logger.info(`Fetching team members by type: ${type}`, {
      path: req.path,
      method: req.method,
    });

    const members = await this.teamsService.getTeamMembersByType(type);
    logger.debug(`Found ${members.length} team members with type ${type}`);

    // Use standardized response format
    successResponse(
      res,
      members,
      `Team members with type ${type} retrieved successfully`
    );
  });

  /**
   * Get team members by batch
   * @route GET /teams/batch/:batch
   */
  getTeamMembersByBatch = catchAsync(async (req, res) => {
    const { batch } = req.params;
    logger.info(`Fetching team members by batch: ${batch}`, {
      path: req.path,
      method: req.method,
    });

    const members = await this.teamsService.getTeamMembersByBatch(batch);
    logger.debug(`Found ${members.length} team members with batch ${batch}`);

    // Use standardized response format
    successResponse(
      res,
      members,
      `Team members with batch ${batch} retrieved successfully`
    );
  });
}
