const router = require("express").Router();
const paymentController = require("../controllers/payment.controller");

router.post("/callback", paymentController.CallBack);

module.exports = router;
