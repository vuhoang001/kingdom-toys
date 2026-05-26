const conversationModel = require("../models/conversation.model");
const chatMessageModel = require("../models/chatMessage.model");
const { BadRequestError, NotFoundError } = require("../response/error.response");
const { ROLE } = require("../utils/enum");

class ChatService {
  /**
   * User lấy hoặc tạo conversation của mình với admin.
   * Mỗi user chỉ có đúng một conversation.
   */
  getOrCreateConversation = async (userId) => {
    let conversation = await conversationModel
      .findOne({ userId })
      .populate("userId", "name email thumbnail")
      .lean();

    if (!conversation) {
      const created = await conversationModel.create({ userId });
      conversation = await conversationModel
        .findById(created._id)
        .populate("userId", "name email thumbnail")
        .lean();
    }

    return conversation;
  };

  /**
   * Admin lấy danh sách tất cả conversation, sắp xếp theo tin nhắn mới nhất.
   */
  getConversations = async ({ skip = 0, limit = 20 } = {}) => {
    const safeSkip = Math.max(Number(skip) || 0, 0);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const [items, total] = await Promise.all([
      conversationModel
        .find()
        .populate("userId", "name email thumbnail")
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip(safeSkip)
        .limit(safeLimit)
        .lean(),
      conversationModel.countDocuments(),
    ]);

    return {
      result: items,
      skip: safeSkip,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    };
  };

  /**
   * Lấy lịch sử tin nhắn của một conversation.
   * User chỉ được xem conversation của mình.
   * Admin được xem tất cả.
   */
  getMessages = async (conversationId, requesterId, requesterRole, { skip = 0, limit = 30 } = {}) => {
    const safeSkip = Math.max(Number(skip) || 0, 0);
    const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);

    const conversation = await conversationModel.findById(conversationId).lean();
    if (!conversation) throw new NotFoundError("Không tìm thấy cuộc trò chuyện");

    if (requesterRole === ROLE.CLIENT && String(conversation.userId) !== String(requesterId)) {
      throw new BadRequestError("Không có quyền truy cập");
    }

    const [items, total] = await Promise.all([
      chatMessageModel
        .find({ conversationId })
        .populate("senderId", "name email thumbnail role")
        .sort({ createdAt: -1 })
        .skip(safeSkip)
        .limit(safeLimit)
        .lean(),
      chatMessageModel.countDocuments({ conversationId }),
    ]);

    return {
      result: items.reverse(),
      skip: safeSkip,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    };
  };

  /**
   * Lưu tin nhắn và cập nhật metadata conversation.
   */
  sendMessage = async ({ conversationId, senderId, senderRole, content }) => {
    if (!content || !content.trim()) {
      throw new BadRequestError("Nội dung tin nhắn không được để trống");
    }

    const conversation = await conversationModel.findById(conversationId);
    if (!conversation) throw new NotFoundError("Không tìm thấy cuộc trò chuyện");

    if (senderRole === ROLE.CLIENT && String(conversation.userId) !== String(senderId)) {
      throw new BadRequestError("Không có quyền gửi tin nhắn");
    }

    const message = await chatMessageModel.create({
      conversationId,
      senderId,
      senderRole,
      content: content.trim(),
    });

    const unreadUpdate =
      senderRole === ROLE.ADMIN
        ? { $inc: { unreadByUser: 1 } }
        : { $inc: { unreadByAdmin: 1 } };

    await conversationModel.findByIdAndUpdate(conversationId, {
      lastMessage: content.trim(),
      lastMessageAt: new Date(),
      ...unreadUpdate,
    });

    return message.populate("senderId", "name email thumbnail role");
  };

  /**
   * Đánh dấu tất cả tin nhắn chưa đọc trong conversation là đã đọc.
   * Admin đọc → reset unreadByAdmin. User đọc → reset unreadByUser.
   */
  markAsRead = async (conversationId, readerId, readerRole) => {
    const conversation = await conversationModel.findById(conversationId);
    if (!conversation) throw new NotFoundError("Không tìm thấy cuộc trò chuyện");

    if (readerRole === ROLE.CLIENT && String(conversation.userId) !== String(readerId)) {
      throw new BadRequestError("Không có quyền truy cập");
    }

    // Chỉ đánh dấu đọc những tin nhắn của phía đối diện
    const senderRoleToMark = readerRole === ROLE.ADMIN ? ROLE.CLIENT : ROLE.ADMIN;

    await chatMessageModel.updateMany(
      { conversationId, senderRole: senderRoleToMark, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    const unreadReset =
      readerRole === ROLE.ADMIN
        ? { unreadByAdmin: 0 }
        : { unreadByUser: 0 };

    await conversationModel.findByIdAndUpdate(conversationId, {
      $set: unreadReset,
    });

    return { success: true };
  };

  /**
   * Lấy conversation theo ID (dùng nội bộ cho socket).
   */
  getConversationById = async (conversationId) => {
    return conversationModel.findById(conversationId).lean();
  };
}

module.exports = new ChatService();
