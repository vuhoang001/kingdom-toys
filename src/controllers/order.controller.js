const orderService = require("../services/order.service");
const { SuccessResponse } = require("../response/success.response");
const { emitOrderUpdatedToUser } = require("../socket/socket");
const notificationService = require("../services/notification.service");

class OrderController {
  Checkout = async (req, res) => {
    const user = req.user;
    new SuccessResponse({
      message: "Checkout success",
      metadata: await orderService.Checkout(req.body, user.userId),
    }).send(res);
  };

  UpdateStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await orderService.UpdateStatus(id, status, req.user?.userId);

    emitOrderUpdatedToUser(updated.userId, {
      orderId: updated.orderId,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
    });
    await notificationService.createOrderUpdatedNotification({
      userId: updated.userId,
      orderId: updated.orderId,
      status: updated.status,
    });

    new SuccessResponse({
      message: "Update status success",
      metadata: updated,
    }).send(res);
  };

  GetOrderById = async (req, res) => {
    const { id } = req.params;
    new SuccessResponse({
      message: "Get by id",
      metadata: await orderService.GetOrderById(id),
    }).send(res);
  };

  GetOrder = async (req, res) => {
    const {
      skip, limit, status, search, filter,
      paymentStatus, paymentMethod, userId,
      fromDate, toDate, minPrice, maxPrice,
    } = req.query;
    new SuccessResponse({
      message: "Get order success",
      metadata: await orderService.GetOrder(
        skip, limit, filter, search,
        status, paymentStatus, paymentMethod, userId,
        fromDate, toDate, minPrice, maxPrice
      ),
    }).send(res);
  };

  GetOrderDetail = async (req, res) => {
    const user = req.user;
    const { search, skip, limit, status } = req.query;
    new SuccessResponse({
      message: "Get order detail success",
      metadata: await orderService.GetOrderByMe(
        skip,
        limit,

        search,
        status,
        user.userId
      ),
    }).send(res);
  };

  CheckOutOrderWithPayload = async (req, res) => {
    const user = req.user;
    new SuccessResponse({
      message: "Check out order",
      metadata: await orderService.CheckOutWithPayload(req.body, user.userId),
    }).send(res);
  };
}

module.exports = new OrderController();
