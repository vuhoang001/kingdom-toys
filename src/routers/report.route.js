const router = require("express").Router();
const { AsyncHandle } = require("../helpers/AsyncHandle");
const { authentication } = require("../helpers/auth");
const reportController = require("../controllers/report.controller");

/**
 * @swagger
 * tags:
 *   name: Report
 *   description: Báo cáo doanh thu
 */

/**
 * @swagger
 * /report/revenue:
 *   get:
 *     summary: Báo cáo doanh thu theo tuần / tháng / năm
 *     tags: [Report]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *         description: >
 *           Loại báo cáo:
 *           `week` — theo tuần (breakdown từng ngày),
 *           `month` — theo tháng (breakdown từng ngày trong tháng),
 *           `year` — theo năm (breakdown từng tháng)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           example: 2025
 *         description: Năm cần báo cáo (mặc định năm hiện tại)
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *           example: 5
 *         description: Tháng cần báo cáo, chỉ dùng khi `type=month` (mặc định tháng hiện tại)
 *       - in: query
 *         name: week
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 53
 *           example: 21
 *         description: Số tuần ISO cần báo cáo, chỉ dùng khi `type=week` (mặc định tuần hiện tại)
 *     responses:
 *       200:
 *         description: Báo cáo doanh thu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Get revenue report success
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                           example: 4500000
 *                         totalOrders:
 *                           type: integer
 *                           example: 18
 *                         from:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-05-19T17:00:00.000Z"
 *                         to:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-05-26T17:00:00.000Z"
 *                     breakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                             example: Monday
 *                           date:
 *                             type: string
 *                             example: "2025-05-19"
 *                           revenue:
 *                             type: number
 *                             example: 750000
 *                           orderCount:
 *                             type: integer
 *                             example: 3
 *       400:
 *         description: Tham số không hợp lệ
 *       401:
 *         description: Chưa xác thực
 */
router.get(
  "/report/revenue",
  authentication,
  AsyncHandle(reportController.GetRevenueReport)
);

/**
 * @swagger
 * /report/revenue/export:
 *   get:
 *     summary: Xuất file Excel báo cáo doanh thu
 *     tags: [Report]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *         description: Loại báo cáo
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           example: 2025
 *         description: Năm (mặc định năm hiện tại)
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *           example: 5
 *         description: Tháng, chỉ dùng khi type=month
 *       - in: query
 *         name: week
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 53
 *           example: 21
 *         description: Số tuần ISO, chỉ dùng khi type=week
 *     responses:
 *       200:
 *         description: File Excel (.xlsx)
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Tham số không hợp lệ
 *       401:
 *         description: Chưa xác thực
 */
router.get(
  "/report/revenue/export",
  authentication,
  AsyncHandle(reportController.ExportRevenueReport)
);

module.exports = router;
