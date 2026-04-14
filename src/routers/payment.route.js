const router = require("express").Router();

const { AsyncHandle } = require("../helpers/AsyncHandle");
const paymentController = require("../controllers/payment.controller");

router.get("/callback", AsyncHandle(paymentController.CallBack));

module.exports = router;
