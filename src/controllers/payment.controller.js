const paymentService = require("../services/payment.service");

class PaymentController {
  CallBack = async (req, res) => {
    try {
      await paymentService.CallBack(req.body);
      return res.json({ return_code: 1, return_message: "success" });
    } catch (error) {
      return res.json({ return_code: 0, return_message: error.message });
    }
  };
}
module.exports = new PaymentController();
