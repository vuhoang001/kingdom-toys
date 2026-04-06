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

  UpdateStatusOrder = async (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;
    const updatedOrder = await orderService.UpdateStatusOrder(orderId, status);

    emitOrderUpdatedToUser(updatedOrder.userId, {
      orderId: updatedOrder.orderId,
      status: updatedOrder.status,
    });
    await notificationService.createOrderUpdatedNotification({
      userId: updatedOrder.userId,
      orderId: updatedOrder.orderId,
      status: updatedOrder.status,
    });

    new SuccessResponse({
      message: "Update success",
      metadata: updatedOrder,
    }).send(res);
  };

  CancelOrder = async (req, res) => {
    const orderId = req.params.id;

    new SuccessResponse({
      message: "Cancel success",
      metadata: await orderService.CancelOrder(orderId),
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
    const { skip, limit, status, search, filter } = req.query;
    new SuccessResponse({
      message: "Get order success",
      metadata: await orderService.GetOrder(
        skip,
        limit,
        filter,
        search,
        status
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
