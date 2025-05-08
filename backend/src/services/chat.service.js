import { db } from "../config/firebase.config.js";

export class ChatService {
  async createMessage(senderId, receiverId, content) {
    try {
      const messageData = {
        senderId,
        receiverId,
        content,
        timestamp: new Date().toISOString(),
        read: false,
      };

      const messageRef = await db.collection("messages").add(messageData);
      return { id: messageRef.id, ...messageData };
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
}
