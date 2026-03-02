import { Server } from "socket.io";
import { verifyToken } from "../utils/jwt.js";
import { logger } from "./logger.js";

let io = null;

export function initSocket(server) {
  io = new Server(server, {
    cors: { origin: "*" }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthorized"));
      }
      const decoded = verifyToken(token);
      socket.user = decoded;
      return next();
    } catch (_error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id, user: socket.user?.sub }, "Socket connected");

    socket.on("join:driver", (driverId) => {
      socket.join(`driver:${driverId}`);
    });

    socket.on("join:schedule", (scheduleId) => {
      socket.join(`schedule:${scheduleId}`);
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}

export function getIo() {
  return io;
}
