const chatService = require("../services/chat.service");
const { SuccessResponse } = require("../response/success.response");
const { ROLE } = require("../utils/enum");
const { emitConversationStatusChanged } = require("../socket/socket");

class ChatController {
  /** User: lấy hoặc tạo conversation của mình với admin */
  getMyConversation = async (req, res) => {
    const userId = req.user.userId;
    new SuccessResponse({
      message: "Lấy cuộc trò chuyện thành công",
      metadata: await chatService.getOrCreateConversation(userId),
    }).send(res);
  };

  /** Admin: lấy danh sách tất cả conversation (có thể filter theo status) */
  getConversations = async (req, res) => {
    const { skip, limit, status } = req.query;
    new SuccessResponse({
      message: "Lấy danh sách cuộc trò chuyện thành công",
      metadata: await chatService.getConversations({ skip, limit, status }),
    }).send(res);
  };

  /** Lấy lịch sử tin nhắn */
  getMessages = async (req, res) => {
    const { id } = req.params;
    const { skip, limit } = req.query;
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;

    new SuccessResponse({
      message: "Lấy tin nhắn thành công",
      metadata: await chatService.getMessages(id, requesterId, requesterRole, {
        skip,
        limit,
      }),
    }).send(res);
  };

  /** Gửi tin nhắn qua REST (fallback khi không dùng socket) */
  sendMessage = async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    const senderId = req.user.userId;
    const senderRole = req.user.role;

    new SuccessResponse({
      message: "Gửi tin nhắn thành công",
      metadata: await chatService.sendMessage({
        conversationId: id,
        senderId,
        senderRole,
        content,
      }),
    }).send(res);
  };

  /** Admin: đóng hoặc mở lại conversation */
  updateConversationStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const conversation = await chatService.updateConversationStatus(id, status);
    emitConversationStatusChanged(id, String(conversation.userId._id), status);

    new SuccessResponse({
      message: status === "closed" ? "Đã đóng cuộc trò chuyện" : "Đã mở lại cuộc trò chuyện",
      metadata: conversation,
    }).send(res);
  };

  /** Lấy số tin nhắn chưa đọc (admin: stats tổng; user: số unread của họ) */
  getUnreadCount = async (req, res) => {
    const { userId, role } = req.user;

    const metadata =
      role === ROLE.ADMIN
        ? await chatService.getAdminUnreadStats()
        : await chatService.getUserUnreadCount(userId);

    new SuccessResponse({
      message: "Lấy số tin nhắn chưa đọc thành công",
      metadata,
    }).send(res);
  };

  /** Đánh dấu đã đọc toàn bộ tin nhắn trong conversation */
  markAsRead = async (req, res) => {
    const { id } = req.params;
    const readerId = req.user.userId;
    const readerRole = req.user.role;

    new SuccessResponse({
      message: "Đánh dấu đã đọc thành công",
      metadata: await chatService.markAsRead(id, readerId, readerRole),
    }).send(res);
  };
}

module.exports = new ChatController();
