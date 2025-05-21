import { BaseModel } from "./base.model.js";
import { UserRole } from "../services/auth.service.js";

export class UserModel extends BaseModel {
  constructor() {
    super("users");
  }

  async findByEmail(email) {
    try {
      const snapshot = await this.collection.where("email", "==", email).get();
      if (snapshot.empty) {
        throw new Error("User not found");
      }
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  async updateRole(userId, role) {
    try {
      if (!Object.values(UserRole).includes(role)) {
        throw new Error("Invalid role");
      }
      return this.update(userId, { role });
    } catch (error) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }
  }

  async updatePreferences(userId, preferences) {
    try {
      return this.update(userId, { preferences });
    } catch (error) {
      throw new Error(`Failed to update user preferences: ${error.message}`);
    }
  }

  async searchUsers(query) {
    try {
      const snapshot = await this.collection
        .where("displayName", ">=", query)
        .where("displayName", "<=", query + "\uf8ff")
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }
}
