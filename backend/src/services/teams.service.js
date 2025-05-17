import { db } from "../config/firebase.config.js";
import logger from "../utils/logger.js";

export class TeamsService {
  async getAllTeamMembers() {
    try {
      logger.info("Fetching all team members from Firestore...");
      try {
        const teamsSnapshot = await db.collection("teams").get();
        logger.debug(`Number of documents in snapshot: ${teamsSnapshot.size}`);

        if (teamsSnapshot.size > 0) {
          const teamMembers = teamsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
            };
          });

          logger.debug(
            `Processed ${teamMembers.length} team members from Firestore`
          );
          return teamMembers;
        } else {
          logger.info(
            "No team members found in Firestore, attempting to seed from people.json..."
          );
          try {
            // Try to seed from people.json using the seedTeamsFromPeopleJson method
            return await this.seedTeamsFromPeopleJson();
          } catch (seedError) {
            logger.error("Error seeding from people.json:", seedError);
            throw new Error(
              "No team members found in database. Please run the seed-teams.js script to populate the database."
            );
          }
        }
      } catch (firestoreError) {
        logger.error("Error accessing Firestore:", {
          error: firestoreError.message,
        });
        throw firestoreError;
      }
    } catch (error) {
      logger.error("Error in getAllTeamMembers:", { error: error.message });
      throw error;
    }
  }

  async getTeamMemberById(memberId) {
    try {
      logger.info(`Fetching team member with ID: ${memberId}`);
      const memberDoc = await db.collection("teams").doc(memberId).get();
      if (!memberDoc.exists) {
        logger.info(`Team member with ID ${memberId} not found`);
        return null;
      }
      const data = memberDoc.data();
      logger.debug(`Found team member with ID ${memberId}`);
      return {
        id: memberDoc.id,
        ...data,
      };
    } catch (error) {
      logger.error(`Error in getTeamMemberById:`, { error: error.message });
      throw error;
    }
  }

  async getTeamMembersByType(type) {
    try {
      logger.info(`Fetching team members with type: ${type}`);
      const membersSnapshot = await db
        .collection("teams")
        .where("type", "==", type)
        .get();
      logger.debug(
        `Found ${membersSnapshot.size} team members with type ${type}`
      );

      const members = membersSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        };
      });

      return members;
    } catch (error) {
      logger.error(`Error in getTeamMembersByType:`, { error: error.message });
      throw error;
    }
  }

  async getTeamMembersByBatch(batch) {
    try {
      logger.info(`Fetching team members with batch: ${batch}`);
      const membersSnapshot = await db
        .collection("teams")
        .where("batch", "==", batch)
        .get();
      logger.debug(
        `Found ${membersSnapshot.size} team members with batch ${batch}`
      );

      const members = membersSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        };
      });

      return members;
    } catch (error) {
      logger.error(`Error in getTeamMembersByBatch:`, { error: error.message });
      throw error;
    }
  }

  async seedTeams() {
    try {
      logger.info("Starting teams seeding process...");
      return await this.seedTeamsFromPeopleJson();
    } catch (error) {
      logger.error("Error seeding teams:", { error: error.message });
      throw error;
    }
  }

  async seedTeamsFromPeopleJson() {
    try {
      logger.info("Attempting to read people.json and seed the database...");

      // Import fs and path modules
      const fs = await import("fs");
      const path = await import("path");
      const { fileURLToPath } = await import("url");

      // Get the directory name
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.default.dirname(__filename);

      // Path to the people.json file
      const peopleJsonPath = path.default.join(
        __dirname,
        "../../../frontend/public/people.json"
      );

      // Check if the file exists
      if (!fs.default.existsSync(peopleJsonPath)) {
        throw new Error(`people.json file not found at ${peopleJsonPath}`);
      }

      // Read the people.json file
      const peopleData = JSON.parse(
        fs.default.readFileSync(peopleJsonPath, "utf8")
      );
      logger.debug("Read people.json file successfully");

      // Transform the data to the format expected by our application
      const transformedData = [];

      // Process patrons
      if (peopleData.people.patrons) {
        peopleData.people.patrons.forEach((patron, index) => {
          transformedData.push({
            id: `patron-${index + 1}`,
            ...patron,
          });
        });
      }

      // Process mentors
      if (peopleData.people.mentors) {
        peopleData.people.mentors.forEach((mentor, index) => {
          transformedData.push({
            id: `mentor-${index + 1}`,
            ...mentor,
          });
        });
      }

      // Process batch2022
      if (peopleData.people.batch2022) {
        peopleData.people.batch2022.forEach((member, index) => {
          transformedData.push({
            id: `lead-${index + 1}`,
            batch: "2022",
            ...member,
          });
        });
      }

      // Process batch2023
      if (peopleData.people.batch2023) {
        peopleData.people.batch2023.forEach((member, index) => {
          transformedData.push({
            id: `sublead-${index + 1}`,
            batch: "2023",
            ...member,
          });
        });
      }

      // Process batch2024
      if (peopleData.people.batch2024) {
        peopleData.people.batch2024.forEach((member, index) => {
          transformedData.push({
            id: `member-${index + 1}`,
            batch: "2024",
            ...member,
          });
        });
      }

      // Process developers (add type field if missing)
      if (peopleData.people.developers) {
        peopleData.people.developers.forEach((developer, index) => {
          // Create a new object with the type field first, then spread the developer data
          // This ensures the type field is not overwritten if it already exists
          const developerWithType = {
            id: `dev-${index + 1}`,
            type: "developer", // Add type field
            ...developer,
          };

          // Fix the typo in Adnan's role if present
          if (
            developerWithType.name === "Adnan" &&
            developerWithType.role === "Frontent Developer"
          ) {
            developerWithType.role = "Frontend Developer";
          }

          transformedData.push(developerWithType);
        });
      }

      logger.debug(`Transformed ${transformedData.length} team members`);

      // Use the seedTeamsWithData method to save the data to Firestore
      return await this.seedTeamsWithData(transformedData);
    } catch (error) {
      logger.error("Error in seedTeamsFromPeopleJson:", {
        error: error.message,
      });
      throw error;
    }
  }

  async seedTeamsWithData(teamData) {
    try {
      logger.info("Starting teams seeding process with custom data...");
      logger.debug(`Custom team data to seed: ${teamData.length} members`);

      try {
        const batch = db.batch();

        // Clear existing team members
        logger.info("Clearing existing team members...");
        const existingMembers = await db.collection("teams").get();
        logger.debug(
          `Found ${existingMembers.size} existing team members to clear`
        );
        existingMembers.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        // Add new team members
        logger.info(`Adding ${teamData.length} new team members...`);
        teamData.forEach((member) => {
          logger.debug(`Adding team member: ${member.name} (ID: ${member.id})`);
          const memberRef = db.collection("teams").doc(member.id);
          batch.set(memberRef, member);
        });

        await batch.commit();
        logger.info("Teams seeded successfully with custom data!");

        // Return the team data directly instead of trying to verify
        // This avoids a potential infinite recursion issue
        return teamData;
      } catch (firestoreError) {
        logger.error("Error with Firestore operations:", {
          error: firestoreError.message,
        });
        throw firestoreError;
      }
    } catch (error) {
      logger.error("Error seeding teams with custom data:", {
        error: error.message,
      });
      throw error;
    }
  }
}
