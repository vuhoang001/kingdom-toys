const express = require("express");
const { AsyncHandle } = require("../helpers/AsyncHandle");
const { sendMessage } = require("../controllers/chatbot.controller");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Chatbot
 *   description: AI Chatbot tích hợp Dialogflow ES
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ChatRequest:
 *       type: object
 *       required:
 *         - message
 *       properties:
 *         message:
 *           type: string
 *           description: Nội dung tin nhắn của người dùng
 *           example: "Cho tôi xem các sản phẩm đồ chơi"
 *         sessionId:
 *           type: string
 *           description: ID phiên hội thoại (tuỳ chọn, tự tạo nếu bỏ trống)
 *           example: "user-abc123"
 *     ChatResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "OK"
 *         status:
 *           type: integer
 *           example: 200
 *         metadata:
 *           type: object
 *           properties:
 *             fulfillmentText:
 *               type: string
 *               description: Câu trả lời từ Dialogflow
 *               example: "Chúng tôi có rất nhiều đồ chơi thú vị cho bé!"
 *             intent:
 *               type: string
 *               description: Tên intent được nhận dạng
 *               example: "hoi.san.pham"
 *             confidence:
 *               type: number
 *               format: float
 *               description: Độ tin cậy của kết quả nhận dạng (0–1)
 *               example: 0.95
 *             parameters:
 *               type: object
 *               description: Các tham số được trích xuất từ tin nhắn
 *               example: {}
 */

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Gửi tin nhắn đến chatbot AI
 *     description: |
 *       Gửi tin nhắn văn bản đến Dialogflow ES và nhận phản hồi tự động.
 *
 *       **Lưu ý:**
 *       - `sessionId` giúp Dialogflow duy trì ngữ cảnh hội thoại theo từng người dùng.
 *       - Nếu không truyền `sessionId`, mỗi request sẽ là một phiên mới (không có ngữ cảnh).
 *     tags: [Chatbot]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatRequest'
 *           examples:
 *             hoi_san_pham:
 *               summary: Hỏi về sản phẩm
 *               value:
 *                 message: "Cho tôi xem các sản phẩm đồ chơi"
 *                 sessionId: "user-abc123"
 *             hoi_gia:
 *               summary: Hỏi về giá
 *               value:
 *                 message: "Giá thuê bao nhiêu?"
 *                 sessionId: "user-abc123"
 *             dat_hang:
 *               summary: Đặt hàng
 *               value:
 *                 message: "Tôi muốn thuê đồ chơi"
 *                 sessionId: "user-abc123"
 *     responses:
 *       200:
 *         description: Trả lời từ chatbot thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *       400:
 *         description: Thiếu trường `message` trong request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "message is required"
 *       500:
 *         description: Lỗi kết nối Dialogflow hoặc cấu hình credentials sai
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "Internal Server Error"
 */
router.post("/chat", AsyncHandle(sendMessage));

module.exports = router;
