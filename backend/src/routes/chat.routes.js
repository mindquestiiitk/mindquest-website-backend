import { Router } from "express";
import { ChatController } from "../controllers/chat.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();
const chatController = new ChatController();

// All routes require authentication
router.use(authenticate);

router.post("/message", chatController.createMessage.bind(chatController));

router.get(
  "/history/:userId",
  chatController.getChatHistory.bind(chatController)
);

router.get("/unread", chatController.getUnreadMessages.bind(chatController));

router.put(
  "/read/:senderId",
  chatController.markMessagesAsRead.bind(chatController)
);

export default router;
