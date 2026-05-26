const express = require("express");

const router = express.Router();

router.use("/", require("./user.route"));
router.use("/", require("./genre.route"));
router.use("/", require("./product.route"));
router.use("/", require("./cart.route"));
router.use("/", require("./brand.route.js"));
router.use("/", require("./coupon.route.js"));
router.use("/", require("./address.route.js"));
router.use("/", require("./order.route.js"));
router.use("/", require("./branner.route.js"));
router.use("/", require("./nation.route.js"));
router.use("/", require("./dashboard.route.js"));
router.use("/", require("./payment.route.js"));
router.use("/", require("./zalopay.route.js"));
router.use("/", require("./notification.route.js"));
router.use("/", require("./author.route.js"));

router.use("/", require("./report.route.js"));
router.use("/", require("./async.route.js"));
router.use("/", require("./chatbot.route.js"));
router.use("/", require("./chat.route.js"));
module.exports = router;
