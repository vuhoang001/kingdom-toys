const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");
const accountModel = require("../models/user.model");
const { ORDERSTATUS, PAYMENT_STATUS, ROLE } = require("../utils/enum");

const VIETNAM_TZ = "Asia/Ho_Chi_Minh";
const EXCLUDED = [ORDERSTATUS.CANCELLED, ORDERSTATUS.DRAFT];

function vnMidnight(offsetDays = 0) {
  const now = new Date();
  const vnDateStr = new Date(now.getTime() + 7 * 3600000)
    .toISOString()
    .split("T")[0];
  const base = new Date(`${vnDateStr}T00:00:00+07:00`);
  return new Date(base.getTime() + offsetDays * 86400000);
}

function growthRate(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

class DashboardService {
  GetDashboasd = async () => {
    const todayStart     = vnMidnight(0);
    const yesterdayStart = vnMidnight(-1);
    const thisMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
    const lastMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1);
    const last7DaysStart = vnMidnight(-6);

    const revenueMatch = (from, to) => ({
      createdAt: { $gte: from, ...(to ? { $lt: to } : {}) },
      status: { $nin: EXCLUDED },
    });
    const sumRevenue = (docs) => docs[0]?.total || 0;

    const [
      // ── Tổng quan sản phẩm ──────────────────────────────────────
      productCount,
      outOfStockCount,
      lowStockCount,

      // ── Đơn hàng ────────────────────────────────────────────────
      totalOrders,
      newOrdersToday,
      newOrdersThisMonth,
      ordersByStatus,

      // ── Khách hàng ──────────────────────────────────────────────
      totalClients,
      newClientsToday,
      newClientsThisMonth,

      // ── Doanh thu ───────────────────────────────────────────────
      revToday,
      revYesterday,
      revThisMonth,
      revLastMonth,

      // ── Biểu đồ 7 ngày ─────────────────────────────────────────
      chart7Days,

      // ── Top sản phẩm bán chạy ──────────────────────────────────
      topSellingProducts,

      // ── Đơn hàng gần nhất ──────────────────────────────────────
      recentOrders,
    ] = await Promise.all([
      // Products
      productModel.countDocuments(),
      productModel.countDocuments({ quantity: 0 }),
      productModel.countDocuments({ quantity: { $gt: 0, $lte: 5 } }),

      // Orders
      orderModel.countDocuments(),
      orderModel.countDocuments({ createdAt: { $gte: todayStart } }),
      orderModel.countDocuments({ createdAt: { $gte: thisMonthStart } }),
      orderModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Users
      accountModel.countDocuments({ role: ROLE.CLIENT }),
      accountModel.countDocuments({ role: ROLE.CLIENT, createdAt: { $gte: todayStart } }),
      accountModel.countDocuments({ role: ROLE.CLIENT, createdAt: { $gte: thisMonthStart } }),

      // Revenue
      orderModel.aggregate([
        { $match: revenueMatch(todayStart) },
        { $group: { _id: null, total: { $sum: "$finalPrice" } } },
      ]),
      orderModel.aggregate([
        { $match: revenueMatch(yesterdayStart, todayStart) },
        { $group: { _id: null, total: { $sum: "$finalPrice" } } },
      ]),
      orderModel.aggregate([
        { $match: revenueMatch(thisMonthStart) },
        { $group: { _id: null, total: { $sum: "$finalPrice" } } },
      ]),
      orderModel.aggregate([
        { $match: revenueMatch(lastMonthStart, thisMonthStart) },
        { $group: { _id: null, total: { $sum: "$finalPrice" } } },
      ]),

      // Chart 7 ngày
      orderModel.aggregate([
        { $match: revenueMatch(last7DaysStart) },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: VIETNAM_TZ,
              },
            },
            revenue: { $sum: "$finalPrice" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top 5 sản phẩm bán chạy
      orderModel.aggregate([
        { $match: { status: { $nin: EXCLUDED } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalSold: { $sum: "$items.quantity" },
            revenue: {
              $sum: {
                $multiply: [
                  "$items.price",
                  { $subtract: [1, { $divide: ["$items.discount", 100] }] },
                  "$items.quantity",
                ],
              },
            },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "Products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            productId: "$_id",
            productName: "$product.productName",
            images: "$product.images",
            price: "$product.price",
            totalSold: 1,
            revenue: 1,
          },
        },
      ]),

      // 5 đơn hàng gần nhất
      orderModel
        .find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({ path: "user", select: "name email thumbnail" })
        .lean(),
    ]);

    // ── Xử lý sau aggregation ──────────────────────────────────────
    const statusMap = {};
    ordersByStatus.forEach(({ _id, count }) => { statusMap[_id] = count; });

    const revTodayVal     = sumRevenue(revToday);
    const revYesterdayVal = sumRevenue(revYesterday);
    const revMonthVal     = sumRevenue(revThisMonth);
    const revLastMonthVal = sumRevenue(revLastMonth);

    // Điền 0 cho ngày không có đơn trong 7 ngày
    const chartMap = Object.fromEntries(chart7Days.map((r) => [r._id, r]));
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(last7DaysStart.getTime() + i * 86400000);
      const key = new Date(d.getTime() + 7 * 3600000).toISOString().split("T")[0];
      return {
        date: key,
        revenue: chartMap[key]?.revenue || 0,
        orderCount: chartMap[key]?.orderCount || 0,
      };
    });

    return {
      revenue: {
        today: revTodayVal,
        yesterday: revYesterdayVal,
        todayGrowth: growthRate(revTodayVal, revYesterdayVal),
        thisMonth: revMonthVal,
        lastMonth: revLastMonthVal,
        monthGrowth: growthRate(revMonthVal, revLastMonthVal),
      },
      orders: {
        total: totalOrders,
        newToday: newOrdersToday,
        newThisMonth: newOrdersThisMonth,
        byStatus: {
          pending:   statusMap[ORDERSTATUS.PENDING]   || 0,
          confirmed: statusMap[ORDERSTATUS.CONFIRMED] || 0,
          shipped:   statusMap[ORDERSTATUS.SHIPPED]   || 0,
          delivered: statusMap[ORDERSTATUS.DELIVERED] || 0,
          cancelled: statusMap[ORDERSTATUS.CANCELLED] || 0,
        },
      },
      users: {
        total: totalClients,
        newToday: newClientsToday,
        newThisMonth: newClientsThisMonth,
      },
      products: {
        total: productCount,
        outOfStock: outOfStockCount,
        lowStock: lowStockCount,
      },
      last7DaysRevenue: last7Days,
      topSellingProducts,
      recentOrders: recentOrders.map((o) => ({
        orderId: o._id,
        customer: o.user?.name || o.user?.email || "N/A",
        customerAvatar: o.user?.thumbnail || null,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        finalPrice: o.finalPrice,
        createdAt: o.createdAt,
      })),
    };
  };
}

module.exports = new DashboardService();
