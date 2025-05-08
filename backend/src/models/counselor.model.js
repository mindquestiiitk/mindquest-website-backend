import { BaseModel } from "./base.model.js";
import { UserRole } from "../services/auth.service.js";

export class CounselorModel extends BaseModel {
  constructor() {
    super("counselors");
  }

  async createCounselor(userId, specialization, availability) {
    try {
      return this.create({
        userId,
        specialization,
        availability,
        rating: 0,
        totalRatings: 0,
        isAvailable: true,
        createdAt: new Date(),
      });
    } catch (error) {
      throw new Error(`Failed to create counselor: ${error.message}`);
    }
  }

  async updateAvailability(counselorId, availability) {
    try {
      return this.update(counselorId, { availability });
    } catch (error) {
      throw new Error(`Failed to update availability: ${error.message}`);
    }
  }

  async updateRating(counselorId, newRating) {
    try {
      const counselor = await this.findById(counselorId);
      if (!counselor) {
        throw new Error("Counselor not found");
      }

      const totalRatings = counselor.totalRatings + 1;
      const rating =
        (counselor.rating * counselor.totalRatings + newRating) / totalRatings;

      return this.update(counselorId, { rating, totalRatings });
    } catch (error) {
      throw new Error(`Failed to update rating: ${error.message}`);
    }
  }

  async searchCounselors(query) {
    try {
      const snapshot = await this.collection
        .where("specialization", "==", query)
        .where("isAvailable", "==", true)
        .orderBy("rating", "desc")
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      throw new Error(`Failed to search counselors: ${error.message}`);
    }
  }

  async getAvailableCounselors() {
    try {
      const snapshot = await this.collection
        .where("isAvailable", "==", true)
        .orderBy("rating", "desc")
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      throw new Error(`Failed to get available counselors: ${error.message}`);
    }
  }
}
