const orderController = require("../controllers/order.controller");
const router = require("express").Router();
const { AsyncHandle } = require("../helpers/AsyncHandle");
const { authentication } = require("../helpers/auth");

/**
 * @swagger
 *  tags:
 *      name: Order
 */

/**
 * @swagger
 *  components:
 *      schemas:
 *          Order:
 *              type: object
 *              properties:
 *                  coupon:
 *                      type: string
 *                      description: id of coupon
 *                  fullName:
 *                      type: string
 *                  phone:
 *                      type: string
 *                  addressLine:
 *                      type: string
 *                  ward:
 *                      type: string
 *                  district:
 *                      type: string
 *                  province:
 *                      type: string
 *                  paymentMethod:
 *                      type: string
 *                      description: cod, zalo
 *                      default: "cod"
 *                  notes:
 *                      type: string
 *                  type:
 *                      type: string
 *                      description: CART || NOW
 *                      default: CART
 *                  productId:
 *                      type: string
 *                  quantity:
 *                      type: string
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderItem:
 *       type: object
 *       properties:
 *         productId:
 *           type: string
 *           description: ID của sản phẩm
 *         quantity:
 *           type: number
 *           description: Số lượng đặt hàng
 *
 *     OrderWithPayload:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           description: Danh sách sản phẩm trong đơn hàng
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *         coupon:
 *           type: string
 *           description: ID mã giảm giá (nếu có)
 *         fullName:
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
 *           description: Phương thức thanh toán
 *         notes:
 *           type: string
 *           description: Ghi chú thêm (nếu có)
 *         orderType:
 *           type: string
 *           description: Cart | Now
 */

/**
 * @swagger
 *  /order/checkout:
 *      post:
 *          summary: Checkout
 *          tags: [Order]
 *          security:
 *              - bearerAuth: []
 *          requestBody:
 *              required: true
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Order'
 *          responses:
 *              200:
 *                  description: success
 *
 */
router.post(
  "/order/checkout",
  authentication,
  AsyncHandle(orderController.Checkout)
);

/**
 * @swagger
 * /order:
 *  get:
 *    summary: Get order
 *    tags: [Order]
 *    parameters:
 *      - $ref: '#/components/parameters/Skip'
 *      - $ref: '#/components/parameters/Limit'
 *      - $ref: '#/components/parameters/filter'
 *      - $ref: '#/components/parameters/Search'
 *      - $ref: '#/components/parameters/Status'
 *    security:
 *      - bearerAuth: []
 *    responses:
 *      200:
 *        description: success
 */
router.get("/order", authentication, AsyncHandle(orderController.GetOrder));

/**
 * @swagger
 *  /order/me:
 *    get:
 *      summary: Get order by me
 *      tags: [Order]
 *      parameters:
 *        - $ref: '#/components/parameters/Skip'
 *        - $ref: '#/components/parameters/Limit'
 *        - $ref: '#/components/parameters/filter'
 *        - $ref: '#/components/parameters/Search'
 *        - $ref: '#/components/parameters/Status'
 *      security:
 *        - bearerAuth: []
 *      responses:
 *        200:
 *         description: success
 */
router.get(
  "/order/me",
  authentication,
  AsyncHandle(orderController.GetOrderDetail)
);

/**
 * @swagger
 *  /order/{id}:
 *    get:
 *      summary: Get order by id
 *      tags: [Order]
 *      parameters:
 *        - $ref: '#/components/parameters/Id'
 *      security:
 *        - bearerAuth: []
 *      responses:
 *        200:
 *          description: success
 */
router.get(
  "/order/:id",
  authentication,
  AsyncHandle(orderController.GetOrderById)
);

/**
 * @swagger
 *  /order/CheckoutWithPayload:
 *      post:
 *          summary: Checkout with payload
 *          tags: [Order]
 *          security:
 *              - bearerAuth: []
 *          requestBody:
 *              required: true
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/OrderWithPayload'
 *          responses:
 *              200:
 *                  description: success
 *
 */
router.post(
  "/order/CheckoutWithPayload",
  authentication,
  AsyncHandle(orderController.CheckOutOrderWithPayload)
);

/**
 * @swagger
 *  /order/{id}/status:
 *    post:
 *      summary: Update status
 *      tags: [Order]
 *      parameters:
 *        - $ref: '#/components/parameters/Id'
 *      security:
 *        - bearerAuth: []
 *      responses:
 *        200:
 *          description: success
 *        400:
 *          description: Invalid request, e.g., missing status field
 *        404:
 *          description: Order not found
 *        500:
 *          description: Server error
 */
router.post(
  "/order/:id/status",
  authentication,
  AsyncHandle(orderController.UpdateStatusOrder)
);

/**
 * @swagger
 *  /order/{id}/cancel:
 *    post:
 *      summary: cancel status
 *      tags: [Order]
 *      parameters:
 *        - $ref: '#/components/parameters/Id'
 *      security:
 *        - bearerAuth: []
 *      responses:
 *        200:
 *          description: success
 *        400:
 *          description: Invalid request, e.g., missing status field
 *        404:
 *          description: Order not found
 *        500:
 *          description: Server error
 */
router.post(
  "/order/:id/cancel",
  authentication,
  AsyncHandle(orderController.CancelOrder)
);
module.exports = router;
