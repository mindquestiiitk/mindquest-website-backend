import { db } from "../config/firebase.config.js";

export class TeamsService {
  async getAllTeamMembers() {
    try {
      console.log("Fetching all team members from Firestore...");
      try {
        const teamsSnapshot = await db.collection("teams").get();
        console.log(`Number of documents in snapshot:`, teamsSnapshot.size);

        if (teamsSnapshot.size > 0) {
          const teamMembers = teamsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
            };
          });

          console.log(
            `Processed ${teamMembers.length} team members from Firestore`
          );
          return teamMembers;
        } else {
          console.log(
            "No team members found in Firestore, attempting to seed from people.json..."
          );
          try {
            // Try to seed from people.json using the seedTeamsFromPeopleJson method
            return await this.seedTeamsFromPeopleJson();
          } catch (seedError) {
            console.error("Error seeding from people.json:", seedError);
            throw new Error(
              "No team members found in database. Please run the seed-teams.js script to populate the database."
            );
          }
        }
      } catch (firestoreError) {
        console.error("Error accessing Firestore:", firestoreError);
        throw firestoreError;
      }
    } catch (error) {
      console.error("Error in getAllTeamMembers:", error);
      throw error;
    }
  }

  async getTeamMemberById(memberId) {
    try {
      console.log(`Fetching team member with ID: ${memberId}`);
      const memberDoc = await db.collection("teams").doc(memberId).get();
      if (!memberDoc.exists) {
        console.log(`Team member with ID ${memberId} not found`);
        return null;
      }
      const data = memberDoc.data();
      console.log(`Found team member with ID ${memberId}:`, data);
      return {
        id: memberDoc.id,
        ...data,
      };
    } catch (error) {
      console.error(`Error in getTeamMemberById:`, error);
      throw error;
    }
  }

  async getTeamMembersByType(type) {
    try {
      console.log(`Fetching team members with type: ${type}`);
      const membersSnapshot = await db
        .collection("teams")
        .where("type", "==", type)
        .get();
      console.log(
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
      console.error(`Error in getTeamMembersByType:`, error);
      throw error;
    }
  }

  async getTeamMembersByBatch(batch) {
    try {
      console.log(`Fetching team members with batch: ${batch}`);
      const membersSnapshot = await db
        .collection("teams")
        .where("batch", "==", batch)
        .get();
      console.log(
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
      console.error(`Error in getTeamMembersByBatch:`, error);
      throw error;
    }
  }

  async seedTeams() {
    try {
      console.log("Starting teams seeding process...");
      return await this.seedTeamsFromPeopleJson();
    } catch (error) {
      console.error("Error seeding teams:", error);
      throw error;
    }
  }

  async seedTeamsFromPeopleJson() {
    try {
      console.log("Attempting to read people.json and seed the database...");

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
      console.log("Read people.json file successfully");

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

      console.log(`Transformed ${transformedData.length} team members`);

      // Use the seedTeamsWithData method to save the data to Firestore
      return await this.seedTeamsWithData(transformedData);
    } catch (error) {
      console.error("Error in seedTeamsFromPeopleJson:", error);
      throw error;
    }
  }

  async seedTeamsWithData(teamData) {
    try {
      console.log("Starting teams seeding process with custom data...");
      console.log(`Custom team data to seed: ${teamData.length} members`);

      try {
        const batch = db.batch();

        // Clear existing team members
        console.log("Clearing existing team members...");
        const existingMembers = await db.collection("teams").get();
        console.log(
          `Found ${existingMembers.size} existing team members to clear`
        );
        existingMembers.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        // Add new team members
        console.log(`Adding ${teamData.length} new team members...`);
        teamData.forEach((member) => {
          console.log(`Adding team member: ${member.name} (ID: ${member.id})`);
          const memberRef = db.collection("teams").doc(member.id);
          batch.set(memberRef, member);
        });

        await batch.commit();
        console.log("Teams seeded successfully with custom data!");

        // Return the team data directly instead of trying to verify
        // This avoids a potential infinite recursion issue
        return teamData;
      } catch (firestoreError) {
        console.error("Error with Firestore operations:", firestoreError);
        throw firestoreError;
      }
    } catch (error) {
      console.error("Error seeding teams with custom data:", error);
      throw error;
    }
  }
}
