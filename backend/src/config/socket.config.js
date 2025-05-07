import { Server } from "socket.io";
import { auth } from "./firebase.config.js";

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
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
    console.log("User connected:", socket.user.uid);

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.user.uid} joined room ${roomId}`);
    });

    socket.on("leave_room", (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.user.uid} left room ${roomId}`);
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
      console.log("User disconnected:", socket.user.uid);
    });
  });

  return io;
};
