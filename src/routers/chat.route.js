const router = require("express").Router();
const chatController = require("../controllers/chat.controller");
const { AsyncHandle } = require("../helpers/AsyncHandle");
const { authentication, requireAdmin } = require("../helpers/auth");

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: |
 *     Real-time chat giữa user và admin.
 *
 *     **Luồng Socket.IO:**
 *     1. Client kết nối socket với JWT token (handshake `auth.token`)
 *     2. Server tự join client vào room `user_{userId}` và `admins` (nếu là admin)
 *     3. Mở chat: gọi `GET /chat/conversation` (user) hoặc `GET /chat/conversations` (admin) để lấy `conversationId`
 *     4. Join conversation room: emit event `chat:join` với `{ conversationId }`
 *     5. Gửi tin: emit `chat:send` với `{ conversationId, content }`
 *     6. Nhận tin: lắng nghe event `chat:message`
 *     7. Typing: emit `chat:typing` với `{ conversationId }`
 *     8. Đánh dấu đọc: emit `chat:read` với `{ conversationId }`
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Conversation:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "664abc123def456789000001"
 *         userId:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *             thumbnail:
 *               type: string
 *         status:
 *           type: string
 *           enum: [open, closed]
 *           example: open
 *         lastMessage:
 *           type: string
 *           example: "Cho tôi hỏi về sản phẩm này"
 *         lastMessageAt:
 *           type: string
 *           format: date-time
 *         unreadByAdmin:
 *           type: integer
 *           example: 2
 *         unreadByUser:
 *           type: integer
 *           example: 0
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     ChatMessage:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         conversationId:
 *           type: string
 *         senderId:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *             thumbnail:
 *               type: string
 *             role:
 *               type: string
 *               enum: [A, C]
 *         senderRole:
 *           type: string
 *           enum: [A, C]
 *           description: "A = admin, C = client/user"
 *         content:
 *           type: string
 *           example: "Xin chào, tôi cần hỗ trợ"
 *         isRead:
 *           type: boolean
 *         readAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     SendMessageBody:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           maxLength: 2000
 *           example: "Xin chào, tôi muốn hỏi về sản phẩm"
 */

/**
 * @swagger
 * /chat/conversation:
 *   get:
 *     summary: "[User] Lấy hoặc tạo conversation với admin"
 *     description: >
 *       Mỗi user chỉ có một conversation duy nhất với admin.
 *       Nếu chưa tồn tại, hệ thống tự tạo mới.
 *       Dùng `_id` trả về làm `conversationId` cho các API và socket event tiếp theo.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 metadata:
 *                   $ref: '#/components/schemas/Conversation'
 */
router.get(
  "/chat/conversation",
  authentication,
  AsyncHandle(chatController.getMyConversation)
);

/**
 * @swagger
 * /chat/conversations:
 *   get:
 *     summary: "[Admin] Lấy danh sách tất cả conversation"
 *     description: Trả về danh sách conversation sắp xếp theo tin nhắn mới nhất. Chỉ admin mới có quyền.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Skip'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, closed]
 *         description: Lọc theo trạng thái conversation (bỏ qua để lấy tất cả)
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     result:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Conversation'
 *                     total:
 *                       type: integer
 *                     skip:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get(
  "/chat/conversations",
  authentication,
  requireAdmin,
  AsyncHandle(chatController.getConversations)
);

/**
 * @swagger
 * /chat/conversations/{id}/messages:
 *   get:
 *     summary: Lấy lịch sử tin nhắn của một conversation
 *     description: >
 *       User chỉ được xem conversation của chính mình.
 *       Admin được xem tất cả.
 *       Tin nhắn trả về theo thứ tự từ cũ đến mới (sau khi đã reverse).
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của conversation
 *       - $ref: '#/components/parameters/Skip'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     result:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ChatMessage'
 *                     total:
 *                       type: integer
 *                     skip:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get(
  "/chat/conversations/:id/messages",
  authentication,
  AsyncHandle(chatController.getMessages)
);

/**
 * @swagger
 * /chat/conversations/{id}/messages:
 *   post:
 *     summary: Gửi tin nhắn (REST fallback)
 *     description: >
 *       Fallback khi không dùng socket. Ưu tiên dùng socket event `chat:send` cho real-time.
 *       User chỉ được gửi vào conversation của mình. Admin được gửi vào bất kỳ conversation nào.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của conversation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendMessageBody'
 *     responses:
 *       200:
 *         description: Gửi thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 metadata:
 *                   $ref: '#/components/schemas/ChatMessage'
 */
router.post(
  "/chat/conversations/:id/messages",
  authentication,
  AsyncHandle(chatController.sendMessage)
);

/**
 * @swagger
 * /chat/conversations/{id}/read:
 *   patch:
 *     summary: Đánh dấu đã đọc tất cả tin nhắn trong conversation
 *     description: >
 *       Admin đọc → reset `unreadByAdmin` về 0.
 *       User đọc → reset `unreadByUser` về 0.
 *       Chỉ đánh dấu tin nhắn từ phía đối diện là đã đọc.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của conversation
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 */
router.patch(
  "/chat/conversations/:id/read",
  authentication,
  AsyncHandle(chatController.markAsRead)
);

/**
 * @swagger
 * /chat/conversations/{id}/status:
 *   patch:
 *     summary: "[Admin] Đóng hoặc mở lại conversation"
 *     description: >
 *       Admin đóng conversation (status: closed) để kết thúc hỗ trợ,
 *       hoặc mở lại (status: open). Khi thay đổi, server emit socket event
 *       `chat:status_changed` tới conversation room và user room tương ứng.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của conversation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, closed]
 *                 example: closed
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 metadata:
 *                   $ref: '#/components/schemas/Conversation'
 */
router.patch(
  "/chat/conversations/:id/status",
  authentication,
  requireAdmin,
  AsyncHandle(chatController.updateConversationStatus)
);

/**
 * @swagger
 * /chat/unread-count:
 *   get:
 *     summary: Lấy số tin nhắn chưa đọc
 *     description: >
 *       **Admin:** trả về `{ total, withUnread }` — tổng số conversation và số conversation có tin chưa đọc.
 *
 *       **User:** trả về `{ unreadByUser }` — số tin nhắn từ admin mà user chưa đọc.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 metadata:
 *                   oneOf:
 *                     - type: object
 *                       description: Admin response
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 42
 *                         withUnread:
 *                           type: integer
 *                           example: 7
 *                     - type: object
 *                       description: User response
 *                       properties:
 *                         unreadByUser:
 *                           type: integer
 *                           example: 3
 */
router.get(
  "/chat/unread-count",
  authentication,
  AsyncHandle(chatController.getUnreadCount)
);

module.exports = router;
