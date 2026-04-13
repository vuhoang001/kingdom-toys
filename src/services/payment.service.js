const orderModel = require("../models/order.model");
const { PAYMENT_STATUS } = require("../utils/enum");
const { BadRequestError } = require("../response/error.response");

class PaymentService {
  CallBack = async (payload) => {
    let dataStr = JSON.parse(payload.data);
    let { order } = JSON.parse(dataStr.embed_data);
    const orderData = await orderModel.findOne({ _id: order });
    if (!orderData) throw new BadRequestError("Order not found");

    orderData.paymentStatus = PAYMENT_STATUS.PAID;
    await orderData.save();
  };
}

module.exports = new PaymentService();
