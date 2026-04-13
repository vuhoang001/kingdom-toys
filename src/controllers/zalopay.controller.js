const orderService = require("../services/order.service");
const { emitOrderUpdatedToUser } = require("../socket/socket");
const { SuccessResponse } = require("../response/success.response");
const notificationService = require("../services/notification.service");

class ZaloPayController {
  /**
   * POST /zalopay/callback — ví dụ webhook: cập nhật đơn + push realtime.
   * Body mẫu: { orderId, userId } (userId để biết room socket; production lấy từ đơn sau verify chữ ký ZaloPay).
   */
  callback = async (req, res) => {
    const { orderId, userId } = req.body;

    const updated = await orderService.mockZaloPayCallbackUpdate({
      orderId,
      userId,
    });

    emitOrderUpdatedToUser(updated.userId, {
      orderId: updated.orderId,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
    });
    await notificationService.createPaymentUpdatedNotification({
      userId: updated.userId,
      orderId: updated.orderId,
      paymentStatus: updated.paymentStatus,
      orderStatus: updated.status,
    });

    new SuccessResponse({
      message: "callback processed",
      metadata: {
        orderId: updated.orderId,
        status: updated.status,
        paymentStatus: updated.paymentStatus,
      },
    }).send(res);
  };
}

module.exports = new ZaloPayController();
