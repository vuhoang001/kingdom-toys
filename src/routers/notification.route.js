const router = require("express").Router();
const notificationController = require("../controllers/notification.controller");
const { AsyncHandle } = require("../helpers/AsyncHandle");
const { authentication } = require("../helpers/auth");

router.get(
  "/notification/me",
  authentication,
  AsyncHandle(notificationController.GetMyNotifications)
);
router.post(
  "/notification/:id/read",
  authentication,
  AsyncHandle(notificationController.MarkAsRead)
);
router.post(
  "/notification/read-all",
  authentication,
  AsyncHandle(notificationController.MarkAllAsRead)
);

module.exports = router;
