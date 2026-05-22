const CryptoJS = require("crypto-js");
const orderModel = require("../models/order.model");
const { PAYMENT_METHOD, PAYMENT_STATUS } = require("../utils/enum");
const { BadRequestError } = require("../response/error.response");
const { emitOrderUpdatedToUser } = require("../socket/socket");
const notificationService = require("./notification.service");
const { configs } = require("../configs");

class PaymentService {
  CallBack = async (payload) => {
    // Verify chữ ký MAC từ ZaloPay bằng key2
    const mac = CryptoJS.HmacSHA256(payload.data, configs.ZALO_PAY.key2).toString();
    if (mac !== payload.mac) throw new BadRequestError("Invalid MAC signature");

    // payload.data là JSON string do ZaloPay gửi về
    const dataStr = JSON.parse(payload.data);
    const { order } = JSON.parse(dataStr.embed_data);
    const orderData = await orderModel.findOne({ _id: order });
    if (!orderData) throw new BadRequestError("Order not found");

    if (orderData.paymentMethod !== PAYMENT_METHOD.ZALO) {
      throw new BadRequestError("Order is not ZaloPay payment");
    }

    if (orderData.paymentStatus === PAYMENT_STATUS.PAID) return;

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
