const express = require("express");
const { AsyncHandle } = require("../helpers/AsyncHandle");
const zalopayController = require("../controllers/zalopay.controller");

const router = express.Router();

router.post("/zalopay/callback", AsyncHandle(zalopayController.callback));

module.exports = router;
