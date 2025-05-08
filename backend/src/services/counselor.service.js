import { getFirestore } from "firebase-admin/firestore";
import { UserRole } from "./auth.service.js";
import { db } from "../config/firebase.config.js";

const counselorDb = getFirestore();

export class CounselorService {
  async getCounselorProfile(uid) {
    try {
      const counselorDoc = await counselorDb
        .collection("counselors")
        .doc(uid)
        .get();
      if (!counselorDoc.exists) {
        throw new Error("Counselor not found");
      }
      return { uid, ...counselorDoc.data() };
    } catch (error) {
      throw new Error(`Failed to get counselor profile: ${error.message}`);
    }
  }

  async updateCounselorProfile(uid, data) {
    try {
      await counselorDb
        .collection("counselors")
        .doc(uid)
        .update({
          ...data,
          updatedAt: new Date(),
        });
      return this.getCounselorProfile(uid);
    } catch (error) {
      throw new Error(`Failed to update counselor profile: ${error.message}`);
    }
  }

  async getCounselorSchedule(uid) {
    try {
      const scheduleDoc = await counselorDb
        .collection("schedules")
        .doc(uid)
        .get();
      return scheduleDoc.data() || { availability: [] };
    } catch (error) {
      throw new Error(`Failed to get counselor schedule: ${error.message}`);
    }
  }

  async updateCounselorSchedule(uid, schedule) {
    try {
      await counselorDb.collection("schedules").doc(uid).set(schedule);
      return this.getCounselorSchedule(uid);
    } catch (error) {
      throw new Error(`Failed to update counselor schedule: ${error.message}`);
    }
  }

  async getCounselorClients(uid) {
    try {
      const clientsRef = counselorDb.collection("counselor_clients");
      const snapshot = await clientsRef.where("counselorId", "==", uid).get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      throw new Error(`Failed to get counselor clients: ${error.message}`);
    }
  }

  async createCounselor(userId, data) {
    try {
      const counselorData = {
        ...data,
        userId,
        rating: 0,
        totalRatings: 0,
        availability: {
          monday: { start: "09:00", end: "17:00" },
          tuesday: { start: "09:00", end: "17:00" },
          wednesday: { start: "09:00", end: "17:00" },
          thursday: { start: "09:00", end: "17:00" },
          friday: { start: "09:00", end: "17:00" },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection("counselors").doc(userId).set(counselorData);
      return { id: userId, ...counselorData };
    } catch (error) {
      throw new Error(`Failed to create counselor: ${error.message}`);
    }
  }

  async updateAvailability(userId, availability) {
    try {
      await db.collection("counselors").doc(userId).update({
        availability,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to update availability: ${error.message}`);
    }
  }

  async updateRating(userId, rating) {
    try {
      const counselorRef = db.collection("counselors").doc(userId);
      const counselor = await counselorRef.get();
      const data = counselor.data();

      const newTotalRatings = data.totalRatings + 1;
      const newRating =
        (data.rating * data.totalRatings + rating) / newTotalRatings;

      await counselorRef.update({
        rating: newRating,
        totalRatings: newTotalRatings,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to update rating: ${error.message}`);
    }
  }

  async searchCounselors(query) {
    try {
      const counselors = await db
        .collection("counselors")
        .where("specialties", "array-contains", query)
        .limit(10)
        .get();

      return counselors.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      throw new Error(`Failed to search counselors: ${error.message}`);
    }
  }

  async getAvailableCounselors() {
    try {
      const counselors = await db
        .collection("counselors")
        .where("isAvailable", "==", true)
        .get();

      return counselors.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      throw new Error(`Failed to get available counselors: ${error.message}`);
    }
  }
}
