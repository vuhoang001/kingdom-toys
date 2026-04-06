const notificationService = require("../services/notification.service");
const { SuccessResponse } = require("../response/success.response");

class NotificationController {
  GetMyNotifications = async (req, res) => {
    const userId = req.user.userId;
    const { skip, limit } = req.query;

    new SuccessResponse({
      message: "Get notifications success",
      metadata: await notificationService.getNotificationsByUser(userId, {
        skip,
        limit,
      }),
    }).send(res);
  };

  MarkAsRead = async (req, res) => {
    const userId = req.user.userId;
    const notificationId = req.params.id;

    new SuccessResponse({
      message: "Mark as read success",
      metadata: await notificationService.markAsRead(notificationId, userId),
    }).send(res);
  };

  MarkAllAsRead = async (req, res) => {
    const userId = req.user.userId;

    new SuccessResponse({
      message: "Mark all as read success",
      metadata: await notificationService.markAllAsRead(userId),
    }).send(res);
  };
}

module.exports = new NotificationController();
