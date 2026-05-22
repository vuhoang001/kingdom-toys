const router = require("express").Router();
const { AsyncHandle } = require("../helpers/AsyncHandle");
const dashboardController = require("../controllers/dashboard.controller");

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Tổng quan hệ thống
 */

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Lấy dữ liệu tổng quan cho dashboard
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dữ liệu dashboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     revenue:
 *                       type: object
 *                       description: Doanh thu (đơn không bị huỷ/draft)
 *                       properties:
 *                         today:
 *                           type: number
 *                           example: 1500000
 *                         yesterday:
 *                           type: number
 *                           example: 900000
 *                         todayGrowth:
 *                           type: number
 *                           example: 67
 *                           description: "% tăng trưởng so với hôm qua"
 *                         thisMonth:
 *                           type: number
 *                           example: 24000000
 *                         lastMonth:
 *                           type: number
 *                           example: 18000000
 *                         monthGrowth:
 *                           type: number
 *                           example: 33
 *                           description: "% tăng trưởng so với tháng trước"
 *                     orders:
 *                       type: object
 *                       description: Thống kê đơn hàng
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 320
 *                         newToday:
 *                           type: integer
 *                           example: 12
 *                         newThisMonth:
 *                           type: integer
 *                           example: 87
 *                         byStatus:
 *                           type: object
 *                           properties:
 *                             pending:
 *                               type: integer
 *                               example: 15
 *                             confirmed:
 *                               type: integer
 *                               example: 8
 *                             shipped:
 *                               type: integer
 *                               example: 5
 *                             delivered:
 *                               type: integer
 *                               example: 270
 *                             cancelled:
 *                               type: integer
 *                               example: 22
 *                     users:
 *                       type: object
 *                       description: Thống kê khách hàng
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 540
 *                         newToday:
 *                           type: integer
 *                           example: 3
 *                         newThisMonth:
 *                           type: integer
 *                           example: 28
 *                     products:
 *                       type: object
 *                       description: Thống kê sản phẩm
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 210
 *                         outOfStock:
 *                           type: integer
 *                           example: 4
 *                           description: "Hết hàng (quantity = 0)"
 *                         lowStock:
 *                           type: integer
 *                           example: 11
 *                           description: "Sắp hết (quantity 1–5)"
 *                     last7DaysRevenue:
 *                       type: array
 *                       description: Doanh thu 7 ngày gần nhất (biểu đồ đường)
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             example: "2025-05-22"
 *                           revenue:
 *                             type: number
 *                             example: 1500000
 *                           orderCount:
 *                             type: integer
 *                             example: 6
 *                     topSellingProducts:
 *                       type: array
 *                       description: Top 5 sản phẩm bán chạy nhất
 *                       items:
 *                         type: object
 *                         properties:
 *                           productId:
 *                             type: string
 *                           productName:
 *                             type: string
 *                             example: "Lego City"
 *                           images:
 *                             type: array
 *                             items:
 *                               type: string
 *                           price:
 *                             type: number
 *                             example: 350000
 *                           totalSold:
 *                             type: integer
 *                             example: 42
 *                           revenue:
 *                             type: number
 *                             example: 14700000
 *                     recentOrders:
 *                       type: array
 *                       description: 5 đơn hàng mới nhất
 *                       items:
 *                         type: object
 *                         properties:
 *                           orderId:
 *                             type: string
 *                           customer:
 *                             type: string
 *                             example: "Nguyễn Văn A"
 *                           customerAvatar:
 *                             type: string
 *                             nullable: true
 *                           status:
 *                             type: string
 *                             example: "pending"
 *                           paymentStatus:
 *                             type: string
 *                             example: "paid"
 *                           paymentMethod:
 *                             type: string
 *                             example: "zalo"
 *                           finalPrice:
 *                             type: number
 *                             example: 450000
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 */
router.get("/dashboard", AsyncHandle(dashboardController.GetDashBoard));

module.exports = router;
