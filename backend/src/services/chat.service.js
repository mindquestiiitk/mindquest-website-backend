import { db } from "../config/firebase.config.js";
import { BaseService } from "./base.service.js";

export class ChatService extends BaseService {
  constructor() {
    super("messages");
  }
  async createMessage(senderId, receiverId, content) {
    try {
      const messageData = {
        senderId,
        receiverId,
        content,
        timestamp: new Date().toISOString(),
        read: false,
      };

      return await this.create(messageData);
    } catch (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }
  }

  async getChatHistory(userId1, userId2) {
    try {
      const messages = await db
        .collection("messages")
        .where("senderId", "in", [userId1, userId2])
        .where("receiverId", "in", [userId1, userId2])
        .orderBy("timestamp", "desc")
        .limit(50)
        .get();

      return messages.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      throw new Error(`Failed to get chat history: ${error.message}`);
    }
  }

  async getUnreadMessages(userId) {
    try {
      const messages = await db
        .collection("messages")
        .where("receiverId", "==", userId)
        .where("read", "==", false)
        .orderBy("timestamp", "desc")
        .get();

      return messages.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      throw new Error(`Failed to get unread messages: ${error.message}`);
    }
  }

  async markMessagesAsRead(senderId, receiverId) {
    try {
      const messages = await db
        .collection("messages")
        .where("senderId", "==", senderId)
        .where("receiverId", "==", receiverId)
        .where("read", "==", false)
        .get();

      // Use a batch to update multiple documents efficiently
      const batch = db.batch();
      messages.docs.forEach((doc) => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();
      return { count: messages.size };
    } catch (error) {
      throw new Error(`Failed to mark messages as read: ${error.message}`);
    }
  }
}
