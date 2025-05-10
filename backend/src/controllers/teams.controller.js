import { TeamsService } from "../services/teams.service.js";

export class TeamsController {
  constructor() {
    this.teamsService = new TeamsService();
  }

  async getAllTeamMembers(req, res) {
    try {
      console.log("GET /teams - Fetching all team members");
      const teamMembers = await this.teamsService.getAllTeamMembers();
      console.log(`GET /teams - Found ${teamMembers.length} team members`);

      // Log the first team member to verify data structure
      if (teamMembers.length > 0) {
        console.log("Sample team member data:", teamMembers[0]);
      }

      res.json(teamMembers);
    } catch (error) {
      console.error("GET /teams - Error:", error);
      res.status(500).json({
        error: "Failed to fetch team members",
        details: error.message,
      });
    }
  }

  async getTeamMemberById(req, res) {
    try {
      console.log(`GET /teams/${req.params.id} - Fetching team member`);
      const member = await this.teamsService.getTeamMemberById(req.params.id);

      if (!member) {
        console.log(`GET /teams/${req.params.id} - Team member not found`);
        return res.status(404).json({ error: "Team member not found" });
      }

      console.log(`GET /teams/${req.params.id} - Team member found`);
      res.json(member);
    } catch (error) {
      console.error(`GET /teams/${req.params.id} - Error:`, error);
      res.status(500).json({
        error: "Failed to fetch team member",
        details: error.message,
      });
    }
  }

  async getTeamMembersByType(req, res) {
    try {
      const { type } = req.params;
      console.log(`GET /teams/type/${type} - Fetching team members by type`);

      const members = await this.teamsService.getTeamMembersByType(type);
      console.log(
        `GET /teams/type/${type} - Found ${members.length} team members`
      );

      res.json(members);
    } catch (error) {
      console.error(`GET /teams/type/${req.params.type} - Error:`, error);
      res.status(500).json({
        error: "Failed to fetch team members by type",
        details: error.message,
      });
    }
  }

  async getTeamMembersByBatch(req, res) {
    try {
      const { batch } = req.params;
      console.log(`GET /teams/batch/${batch} - Fetching team members by batch`);

      const members = await this.teamsService.getTeamMembersByBatch(batch);
      console.log(
        `GET /teams/batch/${batch} - Found ${members.length} team members`
      );

      res.json(members);
    } catch (error) {
      console.error(`GET /teams/batch/${req.params.batch} - Error:`, error);
      res.status(500).json({
        error: "Failed to fetch team members by batch",
        details: error.message,
      });
    }
  }

  async seedTeams(req, res) {
    try {
      console.log("POST /teams/seed - Starting seeding process");

      // If request body contains team data, use it for seeding
      if (req.body && req.body.people) {
        console.log("Using provided team data for seeding");

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

        console.log(`Transformed ${transformedData.length} team members`);

        // Use the transformed data for seeding
        await this.teamsService.seedTeamsWithData(transformedData);
      } else {
        // Use default data for seeding
        await this.teamsService.seedTeams();
      }

      const members = await this.teamsService.getAllTeamMembers();
      console.log(
        `POST /teams/seed - Seeding complete, ${members.length} team members available`
      );
      res.json({
        message: "Teams seeded successfully",
        count: members.length,
      });
    } catch (error) {
      console.error("POST /teams/seed - Error:", error);
      res.status(500).json({
        error: "Failed to seed teams",
        details: error.message,
      });
    }
  }
}
