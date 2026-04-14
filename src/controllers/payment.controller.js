const { SuccessResponse } = require("../response/success.response");
const paymentService = require("../services/payment.service");

class PaymentController {
  CallBack = async (req, res) => {
    new SuccessResponse({
      message: "call back success",
      metadata: await paymentService.CallBack(req.body),
    }).send(res);
  };
}
module.exports = new PaymentController(); 
