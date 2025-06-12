import { db } from "../config/firebase.config.js";
import { UserRole } from "./auth.service.js";
import { BaseService } from "./base.service.js";
import { withRetry } from "../utils/firebase-utils.js";

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
        "avatarId",
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
      let searchQuery = {};

      if (!query || query.trim() === "") {
        // If no query provided, return all users (limited for performance)
        searchQuery = {
          orderBy: [["name", "asc"]],
          limit: 50,
        };
      } else {
        // For basic search, we'll use cached read with limit
        searchQuery = {
          orderBy: [["name", "asc"]],
          limit: 100,
        };
      }

      // Simple direct query like reference implementation
      const usersSnapshot = await withRetry(() => {
        let query = db.collection("users");
        if (searchQuery.orderBy) {
          searchQuery.orderBy.forEach(([field, direction]) => {
            query = query.orderBy(field, direction);
          });
        }
        if (searchQuery.limit) {
          query = query.limit(searchQuery.limit);
        }
        return query.get();
      });

      let users = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Remove sensitive data and apply client-side filtering if needed
      users = users.map((user) => ({
        id: user.id,
        ...user,
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
