const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const chatService = require("../services/chat.service");
const AccountModel = require("../models/user.model");
const { ROLE } = require("../utils/enum");

/** Prefix room theo user */
const userRoom = (userId) => `user_${userId}`;
/** Room cho toàn bộ admin đang online */
const ADMIN_ROOM = "admins";
/** Room riêng của từng conversation */
const conversationRoom = (conversationId) => `conversation_${conversationId}`;

let ioInstance = null;

async function socketAuthMiddleware(socket, next) {
  const raw =
    socket.handshake.auth?.token ||
    socket.handshake.auth?.accessToken ||
    (typeof socket.handshake.headers?.authorization === "string"
      ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, "")
      : null);

  if (!raw) return next(new Error("auth_required"));
  if (!process.env.ACCESS_TOKEN) return next(new Error("server_missing_access_token"));

  try {
    const decoded = jwt.verify(raw, process.env.ACCESS_TOKEN);
    if (!decoded.userId) return next(new Error("invalid_token_payload"));
    socket.data.userId = String(decoded.userId);

    // Token mới có role trong payload; token cũ fallback về DB
    if (decoded.role) {
      socket.data.userRole = decoded.role;
    } else {
      const user = await AccountModel.findById(decoded.userId).select("role").lean();
      socket.data.userRole = user?.role ?? null;
    }

    return next();
  } catch {
    return next(new Error("invalid_token"));
  }
}

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
    allowRequest: (req, callback) => callback(null, true),
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const uid = socket.data.userId;
    const role = socket.data.userRole;

    socket.join(userRoom(uid));
    if (role === ROLE.ADMIN) socket.join(ADMIN_ROOM);

    socket.emit("connected", { userId: uid, room: userRoom(uid) });

    // ── join (re-join sau reconnect) ────────────────────────────────────────
    socket.on("join", (payload, ack) => {
      try {
        const userId =
          typeof payload === "object" && payload !== null ? payload.userId : payload;

        if (userId == null || String(userId) !== String(uid)) {
          socket.emit("join_error", { message: "userId không khớp với token" });
          if (typeof ack === "function") ack({ ok: false, message: "userId mismatch" });
          return;
        }

        socket.join(userRoom(userId));
        if (role === ROLE.ADMIN) socket.join(ADMIN_ROOM);
        if (typeof ack === "function") ack({ ok: true, room: userRoom(userId) });
      } catch (err) {
        socket.emit("join_error", { message: err.message });
        if (typeof ack === "function") ack({ ok: false, message: err.message });
      }
    });

    // ── chat:join — vào room của một conversation cụ thể ───────────────────
    socket.on("chat:join", async (payload, ack) => {
      try {
        const { conversationId } = payload || {};
        if (!conversationId) {
          if (typeof ack === "function") ack({ ok: false, message: "Thiếu conversationId" });
          return;
        }

        const conversation = await chatService.getConversationById(conversationId);
        if (!conversation) {
          if (typeof ack === "function") ack({ ok: false, message: "Không tìm thấy conversation" });
          return;
        }

        // User chỉ được join conversation của mình
        if (role !== ROLE.ADMIN && String(conversation.userId) !== String(uid)) {
          if (typeof ack === "function") ack({ ok: false, message: "Không có quyền truy cập" });
          return;
        }

        socket.join(conversationRoom(conversationId));
        if (typeof ack === "function") {
          ack({ ok: true, room: conversationRoom(conversationId) });
        }
      } catch (err) {
        if (typeof ack === "function") ack({ ok: false, message: err.message });
      }
    });

    // ── chat:send — gửi tin nhắn ───────────────────────────────────────────
    socket.on("chat:send", async (payload, ack) => {
      try {
        const { conversationId, content } = payload || {};
        if (!conversationId || !content) {
          if (typeof ack === "function")
            ack({ ok: false, message: "Thiếu conversationId hoặc content" });
          return;
        }

        const message = await chatService.sendMessage({
          conversationId,
          senderId: uid,
          senderRole: role,
          content,
        });

        const msgPayload = { conversationId, message };

        // Emit tới room của conversation (cả hai phía đang online)
        io.to(conversationRoom(conversationId)).emit("chat:message", msgPayload);

        // Nếu admin gửi → notify thêm vào room riêng của user (phòng user chưa join conversation room)
        if (role === ROLE.ADMIN) {
          const conversation = await chatService.getConversationById(conversationId);
          if (conversation) {
            socket.to(userRoom(String(conversation.userId))).emit("chat:message", msgPayload);
          }
        } else {
          // User gửi → notify thêm vào admins room
          socket.to(ADMIN_ROOM).emit("chat:message", msgPayload);
        }

        if (typeof ack === "function") ack({ ok: true, message });
      } catch (err) {
        if (typeof ack === "function") ack({ ok: false, message: err.message });
      }
    });

    // ── chat:typing — chỉ báo đang gõ ─────────────────────────────────────
    socket.on("chat:typing", (payload) => {
      const { conversationId } = payload || {};
      if (!conversationId) return;

      const typingPayload = { conversationId, userId: uid };

      socket.to(conversationRoom(conversationId)).emit("chat:typing", typingPayload);

      if (role === ROLE.ADMIN) {
        chatService.getConversationById(conversationId).then((conv) => {
          if (conv) socket.to(userRoom(String(conv.userId))).emit("chat:typing", typingPayload);
        });
      } else {
        socket.to(ADMIN_ROOM).emit("chat:typing", typingPayload);
      }
    });

    // ── chat:read — đánh dấu đã đọc ───────────────────────────────────────
    socket.on("chat:read", async (payload, ack) => {
      try {
        const { conversationId } = payload || {};
        if (!conversationId) {
          if (typeof ack === "function") ack({ ok: false, message: "Thiếu conversationId" });
          return;
        }

        await chatService.markAsRead(conversationId, uid, role);

        const readPayload = { conversationId, readBy: uid };
        io.to(conversationRoom(conversationId)).emit("chat:read", readPayload);

        if (role === ROLE.ADMIN) {
          const conversation = await chatService.getConversationById(conversationId);
          if (conversation) {
            socket.to(userRoom(String(conversation.userId))).emit("chat:read", readPayload);
          }
        } else {
          socket.to(ADMIN_ROOM).emit("chat:read", readPayload);
        }

        if (typeof ack === "function") ack({ ok: true });
      } catch (err) {
        if (typeof ack === "function") ack({ ok: false, message: err.message });
      }
    });
  });

  ioInstance = io;
  return io;
}

function emitOrderUpdatedToUser(userId, payload) {
  if (!ioInstance || userId == null) return;
  ioInstance.to(userRoom(userId)).emit("order_updated", payload);
}

function emitConversationStatusChanged(conversationId, userId, status) {
  if (!ioInstance) return;
  const payload = { conversationId, status };
  ioInstance.to(conversationRoom(conversationId)).emit("chat:status_changed", payload);
  if (userId != null) {
    ioInstance.to(userRoom(String(userId))).emit("chat:status_changed", payload);
  }
}

function getIo() {
  return ioInstance;
}

module.exports = {
  initSocket,
  emitOrderUpdatedToUser,
  emitConversationStatusChanged,
  getIo,
  userRoom,
  conversationRoom,
  ADMIN_ROOM,
};
