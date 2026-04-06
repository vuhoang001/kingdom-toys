const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

/** Prefix room theo user — chỉ emit tới room này, không broadcast global */
const userRoom = (userId) => `user_${userId}`;

let ioInstance = null;

/**
 * Middleware xác thực JWT (cùng secret với REST API).
 * Client gửi token qua handshake: auth: { token } hoặc header Authorization: Bearer ...
 */
function socketAuthMiddleware(socket, next) {
  const raw =
    socket.handshake.auth?.token ||
    socket.handshake.auth?.accessToken ||
    (typeof socket.handshake.headers?.authorization === "string"
      ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, "")
      : null);

  if (!raw) {
    return next(new Error("auth_required"));
  }
  if (!process.env.ACCESS_TOKEN) {
    return next(new Error("server_missing_access_token"));
  }

  try {
    const decoded = jwt.verify(raw, process.env.ACCESS_TOKEN);
    if (!decoded.userId) {
      return next(new Error("invalid_token_payload"));
    }
    socket.data.userId = String(decoded.userId);
    return next();
  } catch {
    return next(new Error("invalid_token"));
  }
}

/**
 * Khởi tạo Socket.IO gắn vào HTTP server (không tạo server thứ hai).
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
    // Cho phép client gửi lại auth khi reconnect
    allowRequest: (req, callback) => {
      callback(null, true);
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const uid = socket.data.userId;
    // Vào room private ngay khi kết nối (reconnect cũng chạy lại nhánh này)
    socket.join(userRoom(uid));

    socket.emit("connected", {
      userId: uid,
      room: userRoom(uid),
    });

    /**
     * Client có thể emit lại sau reconnect để đảm bảo đã join đúng room.
     * userId phải trùng với JWT — tránh client giả mạo user khác.
     */
    socket.on("join", (payload, ack) => {
      try {
        const userId = typeof payload === "object" && payload !== null
          ? payload.userId
          : payload;

        if (userId == null || String(userId) !== String(uid)) {
          socket.emit("join_error", {
            message: "userId không khớp với token",
          });
          if (typeof ack === "function") {
            ack({ ok: false, message: "userId mismatch" });
          }
          return;
        }

        socket.join(userRoom(userId));
        if (typeof ack === "function") {
          ack({ ok: true, room: userRoom(userId) });
        }
      } catch (err) {
        socket.emit("join_error", { message: err.message });
        if (typeof ack === "function") {
          ack({ ok: false, message: err.message });
        }
      }
    });
  });

  ioInstance = io;
  return io;
}

/**
 * Gửi cập nhật đơn hàng tới đúng một user (room-based, không broadcast all).
 */
function emitOrderUpdatedToUser(userId, payload) {
  if (!ioInstance || userId == null) return;
  ioInstance.to(userRoom(userId)).emit("order_updated", payload);
}

function getIo() {
  return ioInstance;
}

module.exports = {
  initSocket,
  emitOrderUpdatedToUser,
  getIo,
  userRoom,
};
