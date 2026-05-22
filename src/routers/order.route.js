const orderController = require("../controllers/order.controller");
const router = require("express").Router();
const { AsyncHandle } = require("../helpers/AsyncHandle");
const { authentication } = require("../helpers/auth");

/**
 * @swagger
 * tags:
 *   name: Order
 *   description: Quản lý đơn hàng
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderWithPayload:
 *       type: object
 *       required: [items, paymentMethod]
 *       properties:
 *         items:
 *           type: array
 *           description: Danh sách sản phẩm
 *           items:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *         coupon:
 *           type: string
 *           description: ID mã giảm giá (tuỳ chọn)
 *         fullname:
 *           type: string
 *         phone:
 *           type: string
 *         addressLine:
 *           type: string
 *         ward:
 *           type: string
 *         district:
 *           type: string
 *         province:
 *           type: string
 *         paymentMethod:
 *           type: string
 *           enum: [cod, zalo]
 *           default: cod
 *         notes:
 *           type: string
 *         orderType:
 *           type: string
 *           description: Cart | Now
 */

/**
 * @swagger
 * /order/CheckoutWithPayload:
 *   post:
 *     summary: Tạo đơn hàng và thanh toán
 *     description: >
 *       Tạo đơn hàng từ danh sách sản phẩm truyền vào.
 *       Nếu `paymentMethod=zalo`, trả về URL thanh toán ZaloPay.
 *       Nếu `paymentMethod=cod`, tạo đơn luôn với trạng thái `pending`.
 *     tags: [Order]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderWithPayload'
 *           example:
 *             items:
 *               - productId: "664abc123def456789012345"
 *                 quantity: 2
 *             paymentMethod: cod
 *             fullname: Nguyễn Văn A
 *             phone: "0901234567"
 *             addressLine: 123 Lê Lợi
 *             ward: Phường Bến Nghé
 *             district: Quận 1
 *             province: TP. Hồ Chí Minh
 *             notes: Giao giờ hành chính
 *             orderType: Now
 *     responses:
 *       200:
 *         description: Tạo đơn thành công
 *       400:
 *         description: Thiếu thông tin hoặc sản phẩm không tồn tại
 *       401:
 *         description: Chưa xác thực
 */
router.post(
  "/order/CheckoutWithPayload",
  authentication,
  AsyncHandle(orderController.CheckOutOrderWithPayload)
);

/**
 * @swagger
 * /order:
 *   get:
 *     summary: Lấy danh sách tất cả đơn hàng (admin)
 *     tags: [Order]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Skip'
 *       - $ref: '#/components/parameters/Limit'
 *       - $ref: '#/components/parameters/Search'
 *       - $ref: '#/components/parameters/filter'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, shipped, delivered, cancelled, draft]
 *         description: Lọc theo trạng thái đơn hàng
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng có phân trang
 */
router.get("/order", authentication, AsyncHandle(orderController.GetOrder));

/**
 * @swagger
 * /order/me:
 *   get:
 *     summary: Lấy đơn hàng của tôi
 *     tags: [Order]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Skip'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, shipped, delivered, cancelled, draft]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng của user hiện tại
 */
router.get(
  "/order/me",
  authentication,
  AsyncHandle(orderController.GetOrderDetail)
);

/**
 * @swagger
 * /order/{id}:
 *   get:
 *     summary: Lấy chi tiết một đơn hàng
 *     tags: [Order]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       200:
 *         description: Chi tiết đơn hàng
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.get(
  "/order/:id",
  authentication,
  AsyncHandle(orderController.GetOrderById)
);

/**
 * @swagger
 * /order/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái đơn hàng (bao gồm huỷ)
 *     description: >
 *       Dùng chung cho cả admin cập nhật trạng thái và user tự huỷ đơn.
 *
 *
 *       **Luồng hợp lệ:**
 *
 *       `draft` → `pending` → `confirmed` → `shipped` → `delivered`
 *
 *       `pending / confirmed` → `cancelled`
 *
 *
 *       **Lưu ý khi huỷ (`status=cancelled`):**
 *       User chỉ được huỷ đơn của chính mình. Admin có thể huỷ bất kỳ đơn nào.
 *     tags: [Order]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, shipped, delivered, cancelled]
 *                 description: Trạng thái mới của đơn hàng
 *           examples:
 *             confirm:
 *               summary: Admin xác nhận đơn
 *               value:
 *                 status: confirmed
 *             ship:
 *               summary: Admin chuyển sang đang giao
 *               value:
 *                 status: shipped
 *             deliver:
 *               summary: Admin đánh dấu đã giao
 *               value:
 *                 status: delivered
 *             cancel:
 *               summary: User/admin huỷ đơn
 *               value:
 *                 status: cancelled
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Update status success
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: confirmed
 *                     paymentStatus:
 *                       type: string
 *                       example: pending
 *                     userId:
 *                       type: string
 *       400:
 *         description: Transition không hợp lệ hoặc không có quyền
 *         content:
 *           application/json:
 *             examples:
 *               invalidTransition:
 *                 summary: Transition không hợp lệ
 *                 value:
 *                   message: Không thể chuyển từ "delivered" sang "pending"
 *               noPermission:
 *                 summary: Không có quyền huỷ
 *                 value:
 *                   message: Bạn không có quyền huỷ đơn hàng này
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.patch(
  "/order/:id/status",
  authentication,
  AsyncHandle(orderController.UpdateStatus)
);

module.exports = router;
