import { db } from "../config/firebase.config.js";
import { UserRole } from "./auth.service.js";

export class UserService {
  async getUserProfile(userId) {
    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new Error("User not found");
      }
      return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  async updateUserProfile(userId, data) {
    try {
      const allowedFields = ["displayName", "bio", "avatar", "preferences"];
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
      const users = await db
        .collection("users")
        .where("displayName", ">=", query)
        .where("displayName", "<=", query + "\uf8ff")
        .limit(10)
        .get();

      return users.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }
}
