import { Server } from "socket.io";
import { auth } from "./firebase.config.js";
import config from "./config.js";
import { createSocketCorsConfig } from "./cors.config.js";

export const initializeSocket = (server) => {
  // Initialize Socket.IO with centralized CORS configuration
  const io = new Server(server, {
    cors: createSocketCorsConfig(),
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decodedToken = await auth.verifyIdToken(token);
      socket.user = decodedToken;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    // Only log detailed information in development mode
    if (config.isDevelopment) {
      console.log("User connected:", socket.user.uid);
    }

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      if (config.isDevelopment) {
        console.log(`User ${socket.user.uid} joined room ${roomId}`);
      }
    });

    socket.on("leave_room", (roomId) => {
      socket.leave(roomId);
      if (config.isDevelopment) {
        console.log(`User ${socket.user.uid} left room ${roomId}`);
      }
    });

    socket.on("send_message", async (data) => {
      const { roomId, message } = data;
      io.to(roomId).emit("receive_message", {
        sender: socket.user.uid,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      if (config.isDevelopment) {
        console.log("User disconnected:", socket.user.uid);
      }
    });
  });

  return io;
};
