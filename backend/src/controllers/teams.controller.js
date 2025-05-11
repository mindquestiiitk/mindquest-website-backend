/**
 * Teams controller
 * Handles HTTP requests related to team members
 */
import { TeamsService } from "../services/teams.service.js";
import { catchAsync } from "../utils/error.js";
import { successResponse, notFoundResponse } from "../utils/response.js";
import { compatResponse } from "../utils/compatibility.js";
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

    // Use compatibility utility to handle both formats
    compatResponse(
      req,
      res,
      teamMembers,
      "Team members retrieved successfully"
    );
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
    // Use compatibility utility to handle both formats
    compatResponse(req, res, member, "Team member retrieved successfully");
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

    // Use compatibility utility to handle both formats
    compatResponse(
      req,
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

    // Use compatibility utility to handle both formats
    compatResponse(
      req,
      res,
      members,
      `Team members with batch ${batch} retrieved successfully`
    );
  });

  /**
   * Seed teams database
   * @route POST /teams/seed
   */
  seedTeams = catchAsync(async (req, res) => {
    logger.info("Starting teams seeding process", {
      path: req.path,
      method: req.method,
    });

    // If request body contains team data, use it for seeding
    if (req.body && req.body.people) {
      logger.info("Using provided team data for seeding");

      // Transform the data to the format expected by our application
      const transformedData = [];

      // Process patrons
      if (req.body.people.patrons) {
        req.body.people.patrons.forEach((patron, index) => {
          transformedData.push({
            id: `patron-${index + 1}`,
            ...patron,
          });
        });
      }

      // Process mentors
      if (req.body.people.mentors) {
        req.body.people.mentors.forEach((mentor, index) => {
          transformedData.push({
            id: `mentor-${index + 1}`,
            ...mentor,
          });
        });
      }

      // Process batch2022
      if (req.body.people.batch2022) {
        req.body.people.batch2022.forEach((member, index) => {
          transformedData.push({
            id: `lead-${index + 1}`,
            batch: "2022",
            ...member,
          });
        });
      }

      // Process batch2023
      if (req.body.people.batch2023) {
        req.body.people.batch2023.forEach((member, index) => {
          transformedData.push({
            id: `sublead-${index + 1}`,
            batch: "2023",
            ...member,
          });
        });
      }

      // Process batch2024
      if (req.body.people.batch2024) {
        req.body.people.batch2024.forEach((member, index) => {
          transformedData.push({
            id: `member-${index + 1}`,
            batch: "2024",
            ...member,
          });
        });
      }

      // Process developers (add type field if missing)
      if (req.body.people.developers) {
        req.body.people.developers.forEach((developer, index) => {
          transformedData.push({
            id: `dev-${index + 1}`,
            type: "developer", // Add type if missing
            ...developer,
          });
        });
      }

      logger.debug(`Transformed ${transformedData.length} team members`);

      // Use the transformed data for seeding
      await this.teamsService.seedTeamsWithData(transformedData);
    } else {
      // Use default data for seeding
      await this.teamsService.seedTeams();
    }

    const members = await this.teamsService.getAllTeamMembers();
    logger.info(`Seeding complete, ${members.length} team members available`);

    successResponse(
      res,
      { count: members.length },
      "Teams seeded successfully"
    );
  });
}
