import { MessageController } from "../src/controllers/message.controller.js";
import { MessageService } from "../src/services/message.service.js";

// Mock the service
jest.mock("../src/services/message.service.js", () => {
  return {
    MessageService: jest.fn().mockImplementation(() => ({
      sendMessage: jest.fn(),
      getMessages: jest.fn(),
      deleteMessage: jest.fn(),
      markAsRead: jest.fn(),
      getUnreadCount: jest.fn(),
    })),
  };
});

describe("MessageController", () => {
  let messageController;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    messageController = new MessageController();
    mockReq = {
      body: {},
      params: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe("sendMessage", () => {
    it("should send message successfully", async () => {
      const mockMessage = {
        id: "123",
        senderId: "user123",
        receiverId: "counselor123",
        content: "Hello",
        timestamp: "2024-03-20T10:00:00Z",
      };
      mockReq.body = {
        senderId: "user123",
        receiverId: "counselor123",
        content: "Hello",
      };

      MessageService.prototype.sendMessage.mockResolvedValue(mockMessage);

      await messageController.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessage,
        message: "Message sent successfully",
      });
    });

    it("should handle message sending error", async () => {
      mockReq.body = {
        senderId: "user123",
        receiverId: "counselor123",
        content: "Hello",
      };

      MessageService.prototype.sendMessage.mockRejectedValue(
        new Error("Failed to send message")
      );

      await messageController.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to send message",
      });
    });
  });

  describe("getMessages", () => {
    it("should get messages successfully", async () => {
      const mockMessages = [
        {
          id: "123",
          senderId: "user123",
          receiverId: "counselor123",
          content: "Hello",
          timestamp: "2024-03-20T10:00:00Z",
        },
      ];
      mockReq.query = {
        userId: "user123",
        counselorId: "counselor123",
      };

      MessageService.prototype.getMessages.mockResolvedValue(mockMessages);

      await messageController.getMessages(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessages,
        message: "Messages retrieved successfully",
      });
    });

    it("should handle get messages error", async () => {
      mockReq.query = {
        userId: "user123",
        counselorId: "counselor123",
      };

      MessageService.prototype.getMessages.mockRejectedValue(
        new Error("Failed to get messages")
      );

      await messageController.getMessages(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to get messages",
      });
    });
  });

  describe("deleteMessage", () => {
    it("should delete message successfully", async () => {
      mockReq.params = { messageId: "123" };

      MessageService.prototype.deleteMessage.mockResolvedValue();

      await messageController.deleteMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Message deleted successfully",
      });
    });

    it("should handle delete message error", async () => {
      mockReq.params = { messageId: "123" };

      MessageService.prototype.deleteMessage.mockRejectedValue(
        new Error("Failed to delete message")
      );

      await messageController.deleteMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Failed to delete message",
      });
    });
  });
});
