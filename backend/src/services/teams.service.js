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
          logger.warn("No team members found in Firestore");
          return [];
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
}
