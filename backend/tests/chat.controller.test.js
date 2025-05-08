import { ChatController } from "../src/controllers/chat.controller.js";
import { ChatService } from "../src/services/chat.service.js";

jest.mock("../src/services/chat.service.js");

describe("ChatController", () => {
  let chatController;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    chatController = new ChatController();
    mockReq = {
      body: {},
      params: {},
      user: { uid: "123" },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe("createMessage", () => {
    it("should create a message successfully", async () => {
      const mockMessage = {
        id: "msg123",
        senderId: "123",
        receiverId: "456",
        content: "Hello",
        timestamp: "2024-03-20T10:00:00Z",
        read: false,
      };
      mockReq.body = {
        receiverId: "456",
        content: "Hello",
      };

      ChatService.prototype.createMessage.mockResolvedValue(mockMessage);

      await chatController.createMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessage,
        message: "Message sent successfully",
      });
    });

    it("should handle message creation error", async () => {
      mockReq.body = {
        receiverId: "456",
        content: "Hello",
      };

      ChatService.prototype.createMessage.mockRejectedValue(
        new Error("Failed to create message")
      );

      await chatController.createMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to create message",
      });
    });
  });

  describe("getChatHistory", () => {
    it("should get chat history successfully", async () => {
      const mockMessages = [
        {
          id: "msg123",
          senderId: "123",
          receiverId: "456",
          content: "Hello",
          timestamp: "2024-03-20T10:00:00Z",
          read: true,
        },
      ];
      mockReq.params = { userId: "456" };

      ChatService.prototype.getChatHistory.mockResolvedValue(mockMessages);

      await chatController.getChatHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessages,
        message: "Chat history retrieved successfully",
      });
    });

    it("should handle chat history error", async () => {
      mockReq.params = { userId: "456" };

      ChatService.prototype.getChatHistory.mockRejectedValue(
        new Error("Failed to get chat history")
      );

      await chatController.getChatHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to get chat history",
      });
    });
  });

  describe("markMessagesAsRead", () => {
    it("should mark messages as read successfully", async () => {
      mockReq.params = { senderId: "456" };

      ChatService.prototype.markMessagesAsRead.mockResolvedValue();

      await chatController.markMessagesAsRead(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Messages marked as read successfully",
      });
    });

    it("should handle mark as read error", async () => {
      mockReq.params = { senderId: "456" };

      ChatService.prototype.markMessagesAsRead.mockRejectedValue(
        new Error("Failed to mark messages as read")
      );

      await chatController.markMessagesAsRead(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to mark messages as read",
      });
    });
  });

  describe("getUnreadMessages", () => {
    it("should get unread messages successfully", async () => {
      const mockMessages = [
        {
          id: "msg123",
          senderId: "456",
          receiverId: "123",
          content: "Hello",
          timestamp: "2024-03-20T10:00:00Z",
          read: false,
        },
      ];

      ChatService.prototype.getUnreadMessages.mockResolvedValue(mockMessages);

      await chatController.getUnreadMessages(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessages,
        message: "Unread messages retrieved successfully",
      });
    });

    it("should handle unread messages error", async () => {
      ChatService.prototype.getUnreadMessages.mockRejectedValue(
        new Error("Failed to get unread messages")
      );

      await chatController.getUnreadMessages(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to get unread messages",
      });
    });
  });
});
