const orderModel = require("../models/order.model");
const { PAYMENT_METHOD, PAYMENT_STATUS } = require("../utils/enum");
const { BadRequestError } = require("../response/error.response");
const { emitOrderUpdatedToUser } = require("../socket/socket");
const notificationService = require("./notification.service");

class PaymentService {
  CallBack = async (payload) => {
    console.log("ZALOOOOOOOOOOOOOOOO", payload);
    // payload.data là JSON string do ZaloPay gửi về
    const dataStr = JSON.parse(payload.data);
    const { order } = JSON.parse(dataStr.embed_data);
    const orderData = await orderModel.findOne({ _id: order });
    if (!orderData) throw new BadRequestError("Order not found");

    if (orderData.paymentMethod !== PAYMENT_METHOD.ZALO) {
      throw new BadRequestError("Order is not ZaloPay payment");
    }

    orderData.paymentStatus = PAYMENT_STATUS.PAID;
    await orderData.save();

    const userId = String(orderData.user);
    const metadata = {
      orderId: String(orderData._id),
      status: orderData.status,
      paymentStatus: orderData.paymentStatus,
      userId,
    };

    // Realtime + lưu notification
    emitOrderUpdatedToUser(userId, {
      orderId: metadata.orderId,
      status: metadata.status,
      paymentStatus: metadata.paymentStatus,
    });
    await notificationService.createPaymentUpdatedNotification({
      userId,
      orderId: metadata.orderId,
      paymentStatus: metadata.paymentStatus,
      orderStatus: metadata.status,
    });

    return metadata;
  };
}

module.exports = new PaymentService();
