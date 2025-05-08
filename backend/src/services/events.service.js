import { db } from "../config/firebase.config.js";
import eventsData from "../config/events.data.js";

export class EventsService {
  async getAllEvents() {
    try {
      console.log("Fetching all events from Firestore...");
      const eventsSnapshot = await db.collection("events").get();
      console.log(`Raw Firestore response:`, eventsSnapshot);
      console.log(`Number of documents in snapshot:`, eventsSnapshot.size);

      const events = eventsSnapshot.docs.map((doc) => {
        const data = doc.data();
        console.log(`Document ${doc.id} data:`, data);
        return {
          id: doc.id,
          ...data,
        };
      });

      console.log(`Processed ${events.length} events from Firestore`);
      console.log("Events data:", events);
      return events;
    } catch (error) {
      console.error("Error in getAllEvents:", error);
      throw error;
    }
  }

  async getEventById(eventId) {
    try {
      console.log(`Fetching event with ID: ${eventId}`);
      const eventDoc = await db.collection("events").doc(eventId).get();
      if (!eventDoc.exists) {
        console.log(`Event with ID ${eventId} not found`);
        return null;
      }
      const data = eventDoc.data();
      console.log(`Found event with ID ${eventId}:`, data);
      return {
        id: eventDoc.id,
        ...data,
      };
    } catch (error) {
      console.error(`Error in getEventById:`, error);
      throw error;
    }
  }

  async seedEvents() {
    try {
      console.log("Starting events seeding process...");
      console.log("Events data to seed:", eventsData);
      const batch = db.batch();

      // Clear existing events
      console.log("Clearing existing events...");
      const existingEvents = await db.collection("events").get();
      console.log(`Found ${existingEvents.size} existing events to clear`);
      existingEvents.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Add new events
      console.log(`Adding ${eventsData.events.length} new events...`);
      eventsData.events.forEach((event) => {
        console.log(`Adding event: ${event.title} (ID: ${event.id})`);
        const eventRef = db.collection("events").doc(event.id);
        batch.set(eventRef, event);
      });

      await batch.commit();
      console.log("Events seeded successfully!");

      // Verify seeding
      const verifyEvents = await this.getAllEvents();
      console.log(
        `Verification: Found ${verifyEvents.length} events after seeding`
      );
      return true;
    } catch (error) {
      console.error("Error seeding events:", error);
      throw error;
    }
  }
}
