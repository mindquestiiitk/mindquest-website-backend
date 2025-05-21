import { ChatService } from "../services/chat.service.js";

export class ChatController {
  constructor() {
    this.chatService = new ChatService();
  }

  async createMessage(req, res) {
    try {
      const { receiverId, content } = req.body;
      const senderId = req.user.uid;
      const message = await this.chatService.createMessage(
        senderId,
        receiverId,
        content
      );
      res.status(201).json({
        success: true,
        data: message,
        message: "Message sent successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getChatHistory(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.uid;
      const messages = await this.chatService.getChatHistory(
        currentUserId,
        userId
      );
      res.status(200).json({
        success: true,
        data: messages,
        message: "Chat history retrieved successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getUnreadMessages(req, res) {
    try {
      const userId = req.user.uid;
      const messages = await this.chatService.getUnreadMessages(userId);
      res.status(200).json({
        success: true,
        data: messages,
        message: "Unread messages retrieved successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async markMessagesAsRead(req, res) {
    try {
      const { senderId } = req.params;
      const receiverId = req.user.uid;
      await this.chatService.markMessagesAsRead(senderId, receiverId);
      res.status(200).json({
        success: true,
        message: "Messages marked as read successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}
