const orderService = require("../services/order.service");
const { SuccessResponse } = require("../response/success.response");

class OrderController {
  Checkout = async (req, res) => {
    const user = req.user;
    new SuccessResponse({
      message: "Checkout success",
      metadata: await orderService.Checkout(req.body, user.userId),
    }).send(res);
  };
}

module.exports = new OrderController();
