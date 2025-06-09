import { db } from "../config/firebase.config.js";
import { UserRole } from "./auth.service.js";
import { BaseService } from "./base.service.js";

export class UserService extends BaseService {
  constructor() {
    super("users");
  }
  async getUserProfile(userId) {
    try {
      const user = await this.getById(userId);
      if (!user) {
        throw new Error("User not found");
      }
      return user;
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  async updateUserProfile(userId, data) {
    try {
      const allowedFields = [
        "displayName",
        "bio",
        "avatar",
        "preferences",
        "socialLinks",
      ];
      const updateData = Object.keys(data)
        .filter((key) => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = data[key];
          return obj;
        }, {});

      updateData.updatedAt = new Date().toISOString();

      await db.collection("users").doc(userId).update(updateData);
      return { id: userId, ...updateData };
    } catch (error) {
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
  }

  async updateUserPreferences(userId, preferences) {
    try {
      await db.collection("users").doc(userId).update({
        preferences,
        updatedAt: new Date(),
      });
      return this.getUserProfile(userId);
    } catch (error) {
      throw new Error(`Failed to update user preferences: ${error.message}`);
    }
  }

  async deleteUser(userId) {
    try {
      await db.collection("users").doc(userId).delete();
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async searchUsers(query) {
    try {
      let usersQuery;

      if (!query || query.trim() === "") {
        // If no query provided, return all users (limited for performance)
        usersQuery = db.collection("users").limit(50);
      } else {
        // Search by displayName, email, or name fields
        const searchTerm = query.toLowerCase().trim();

        // For now, we'll get all users and filter client-side since Firestore
        // doesn't support OR queries across different fields easily
        usersQuery = db.collection("users").limit(100);
      }

      const snapshot = await usersQuery.get();
      let users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Remove sensitive data
        password: undefined,
        refreshTokens: undefined,
      }));

      // If there's a search query, filter the results client-side
      if (query && query.trim() !== "") {
        const searchTerm = query.toLowerCase().trim();
        users = users.filter((user) => {
          const displayName = (user.displayName || "").toLowerCase();
          const email = (user.email || "").toLowerCase();
          const name = (user.name || "").toLowerCase();

          return (
            displayName.includes(searchTerm) ||
            email.includes(searchTerm) ||
            name.includes(searchTerm)
          );
        });
      }

      return users;
    } catch (error) {
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }
}
