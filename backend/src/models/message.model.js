import { BaseModel } from "./base.model.js";

export class MessageModel extends BaseModel {
  constructor() {
    super("messages");
  }

  async createMessage(senderId, receiverId, content) {
    try {
      return this.create({
        senderId,
        receiverId,
        content,
        read: false,
        timestamp: new Date(),
      });
    } catch (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }
  }

  async getChatHistory(userId1, userId2, limit = 50) {
    try {
      const snapshot = await this.collection
        .where("senderId", "in", [userId1, userId2])
        .where("receiverId", "in", [userId1, userId2])
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      throw new Error(`Failed to get chat history: ${error.message}`);
    }
  }

  async getUnreadMessages(userId) {
    try {
      const snapshot = await this.collection
        .where("receiverId", "==", userId)
        .where("read", "==", false)
        .orderBy("timestamp", "desc")
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      throw new Error(`Failed to get unread messages: ${error.message}`);
    }
  }

  async markMessagesAsRead(messageIds) {
    try {
      const batch = this.collection.firestore.batch();
      messageIds.forEach((messageId) => {
        const messageRef = this.collection.doc(messageId);
        batch.update(messageRef, { read: true });
      });
      await batch.commit();
    } catch (error) {
      throw new Error(`Failed to mark messages as read: ${error.message}`);
    }
  }
}
