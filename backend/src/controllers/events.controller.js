import { EventsService } from "../services/events.service.js";

export class EventsController {
  constructor() {
    this.eventsService = new EventsService();
  }

  async getAllEvents(req, res) {
    try {
      console.log("GET /events - Fetching all events");
      const events = await this.eventsService.getAllEvents();
      console.log(`GET /events - Found ${events.length} events`);
      if (!events || events.length === 0) {
        console.log("GET /events - No events found, attempting to seed...");
        await this.eventsService.seedEvents();
        const seededEvents = await this.eventsService.getAllEvents();
        console.log(
          `GET /events - After seeding, found ${seededEvents.length} events`
        );
        return res.json(seededEvents);
      }
      res.json(events);
    } catch (error) {
      console.error("GET /events - Error:", error);
      res.status(500).json({
        error: "Failed to fetch events",
        details: error.message,
      });
    }
  }

  async getEventById(req, res) {
    try {
      console.log(`GET /events/${req.params.id} - Fetching event`);
      const event = await this.eventsService.getEventById(req.params.id);
      if (!event) {
        console.log(`GET /events/${req.params.id} - Event not found`);
        return res.status(404).json({ error: "Event not found" });
      }
      console.log(`GET /events/${req.params.id} - Event found`);
      res.json(event);
    } catch (error) {
      console.error(`GET /events/${req.params.id} - Error:`, error);
      res.status(500).json({
        error: "Failed to fetch event",
        details: error.message,
      });
    }
  }

  async seedEvents(req, res) {
    try {
      console.log("POST /events/seed - Starting seeding process");
      await this.eventsService.seedEvents();
      const events = await this.eventsService.getAllEvents();
      console.log(
        `POST /events/seed - Seeding complete, ${events.length} events available`
      );
      res.json({
        message: "Events seeded successfully",
        count: events.length,
      });
    } catch (error) {
      console.error("POST /events/seed - Error:", error);
      res.status(500).json({
        error: "Failed to seed events",
        details: error.message,
      });
    }
  }
}
