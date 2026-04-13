const convertOrderStatus = require("../helpers/convertOrderStatus");
const convertPaymentStatus = require("../helpers/convertPaymentStatus");
const notificationModel = require("../models/notification.model");
const { BadRequestError } = require("../response/error.response");

class NotificationService {
  createOrderUpdatedNotification = async ({ userId, orderId, status }) => {
    if (!userId || !orderId || !status) {
      throw new BadRequestError("Thiếu dữ liệu để tạo thông báo");
    }

    const message = `Đơn hàng #${orderId} đã được cập nhật sang trạng thái ${convertOrderStatus(status)}`;

    const created = await notificationModel.create({
      user: userId,
      type: "order_updated",
      title: "Cập nhật đơn hàng",
      message,
      data: {
        orderId,
        status,
      },
    });

    return created;
  };

  /** Thanh toán (ZaloPay) — tách nội dung khỏi thông báo cập nhật trạng thái đơn */
  createPaymentUpdatedNotification = async ({
    userId,
    orderId,
    paymentStatus,
    orderStatus,
  }) => {
    if (!userId || !orderId || !paymentStatus) {
      throw new BadRequestError("Thiếu dữ liệu để tạo thông báo thanh toán");
    }

    const payLabel = convertPaymentStatus(paymentStatus);
    const orderLabel = orderStatus
      ? convertOrderStatus(orderStatus)
      : null;
    const message = orderLabel
      ? `Đơn #${orderId}: ${payLabel}. Trạng thái đơn: ${orderLabel}.`
      : `Đơn #${orderId}: ${payLabel}.`;

    const created = await notificationModel.create({
      user: userId,
      type: "payment_updated",
      title: "Cập nhật thanh toán",
      message,
      data: {
        orderId,
        paymentStatus,
        ...(orderStatus != null ? { status: orderStatus } : {}),
      },
    });

    return created;
  };

  getNotificationsByUser = async (userId, { skip = 0, limit = 20 } = {}) => {
    const safeSkip = Math.max(Number(skip) || 0, 0);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const [items, total, unreadCount] = await Promise.all([
      notificationModel
        .find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(safeSkip)
        .limit(safeLimit)
        .lean(),
      notificationModel.countDocuments({ user: userId }),
      notificationModel.countDocuments({ user: userId, isRead: false }),
    ]);

    return {
      result: items,
      skip: safeSkip,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      unreadCount,
    };
  };

  markAsRead = async (notificationId, userId) => {
    const updated = await notificationModel.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!updated) throw new BadRequestError("Không tìm thấy thông báo");
    return updated;
  };

  markAllAsRead = async (userId) => {
    const result = await notificationModel.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return {
      modifiedCount: result.modifiedCount || 0,
    };
  };
}

module.exports = new NotificationService();
