const orderModel = require("../models/order.model");
const productModel = require("../models/product.model");
const { BadRequestError } = require("../response/error.response");
const { ORDERSTATUS, PAYMENT_METHOD, PAYMENT_STATUS } = require("../utils/enum");
const couponModel = require("../models/coupon.model");

const { parseFilterString } = require("../utils");
const { Pagination } = require("../response/success.response");
const PaymentHandler = require("./payments/PaymentFactor");
const {
  validateAndApplyCoupon,
} = require("./ValidateOrder/validateAndApplyCoupon");

const {
  generateOrderItemFromCart,
  generateOrderItemsFromProduct,
} = require("./Order/orderItem.helper");

const ORDER_ITEM_GENERATORS = {
  CART: async (payload, userId) => await generateOrderItemFromCart(userId),
  NOW: async (payload, userId) =>
    await generateOrderItemsFromProduct(payload.productId, payload.quantity),
};

class OrderService {
  UpdateStatusOrder = async (orderId, status) => {
    const holderOrder = await orderModel.findOne({ _id: orderId });
    if (!holderOrder) throw new BadRequestError("Không tìm thấy đơn hàng");

    // Giữ tương thích ngược: nếu không truyền status thì mặc định confirmed
    const nextStatus = status || ORDERSTATUS.CONFIRMED;
    holderOrder.status = nextStatus;
    await holderOrder.save();
    return {
      message: "Success",
      orderId: String(holderOrder._id),
      status: holderOrder.status,
      paymentStatus: holderOrder.paymentStatus,
      userId: String(holderOrder.user),
    };
  };

  /**
   * Mô phỏng xử lý sau ZaloPay callback: chỉ cập nhật `paymentStatus` (thanh toán),
   * không gán `status` đơn hàng = paid — trạng thái đơn (pending/confirmed/...) do nghiệp vụ khác.
   * Webhook thật: verify chữ ký ZaloPay, map trans_status → PAYMENT_STATUS.
   */
  mockZaloPayCallbackUpdate = async ({ orderId, userId }) => {
    if (!orderId || !userId) {
      throw new BadRequestError("Thiếu orderId hoặc userId");
    }

    const holderOrder = await orderModel.findOne({ _id: orderId });
    if (!holderOrder) throw new BadRequestError("Không tìm thấy đơn hàng");

    if (String(holderOrder.user) !== String(userId)) {
      throw new BadRequestError("Đơn hàng không thuộc khách hàng");
    }

    if (holderOrder.paymentMethod !== PAYMENT_METHOD.ZALO) {
      throw new BadRequestError("Đơn không dùng thanh toán ZaloPay");
    }

    holderOrder.paymentStatus = PAYMENT_STATUS.PAID;
    await holderOrder.save();

    return {
      orderId: String(holderOrder._id),
      status: holderOrder.status,
      paymentStatus: holderOrder.paymentStatus,
      userId: String(userId),
    };
  };

  CancelOrder = async (orderId) => {
    const holderOrder = await orderModel.findOne({ _id: orderId });
    if (!holderOrder) throw new BadRequestError("Không tìm thấy giỏ hàng");
    holderOrder.status = ORDERSTATUS.CANCELLED;
    await holderOrder.save();
    return "Suceess";
  };

  Checkout = async (payload, userId) => {
    if (!payload.paymentMethod)
      throw new BadRequestError("Không có phương thức thanh toán");

    const type = payload.type;
    if (!type) throw new BadRequestError("Vui lòng kiểu thanh toán");
    const strategy = ORDER_ITEM_GENERATORS[type];

    if (!strategy)
      throw new BadRequestError(` Loại giỏ hàng không hợp lệ: ${type}`);

    const { items, totalPrice, finalPrice, cart } = await strategy(
      payload,
      userId
    );

    let discountvalue = 0;
    let couponId = null;

    let finalPriceAfterCoupon = finalPrice;

    if (payload.coupon) {
      const result = await validateAndApplyCoupon(
        payload.coupon,
        userId,
        finalPrice
      );

      discountvalue = result.discountValue;
      couponId = result.couponId;
      finalPriceAfterCoupon = result.finalPrice;
    }

    const order = new orderModel({
      items,
      totalPrice,
      finalPrice: finalPriceAfterCoupon,
      status: ORDERSTATUS.PENDING,
      shippingAddress: {
        addressLine: payload.addressLine,
        district: payload.district,
        phone: payload.phone,
        fullName: payload.fullName,
        province: payload.province,
        ward: payload.ward,
      },
      notes: payload.notes,
      paymentMethod: payload.paymentMethod,
      user: userId,
      coupon: couponId,
      isDeleted: false,
    });

    await order.save();

    //Xóa giỏ hàng
    if (cart) await cart.deleteOne();

    return result;
  };
  GetOrderById = async (id) => {
    let order = await orderModel
      .findOne({ _id: id })
      .populate("coupon")
      .populate("items.product")
      .populate({
        path: "user",
        select: "name email status thumbnail phone address",
      });

    if (!order) throw new BadRequestError("Not found order");

    // Convert document Mongoose thành plain object
    order = order.toObject();

    // Chuẩn hoá items giống GetOrder
    order.items = order.items.map((item) => {
      const product = item.product || {};
      return {
        _id: item._id,
        productId: product._id,
        productName: product.productName,
        images: product.images,
        price: item.price,
        quantity: item.quantity,
        discount: item.discount,
      };
    });

    return order;
  };

  GetOrder = async (
    skip = 0,
    limit = 30,
    filter = null,
    search = null,
    status = null
  ) => {
    filter = parseFilterString(filter, search, ["status"]);

    const total = await orderModel.countDocuments(filter);
    const rawOrders = await orderModel
      .find(filter)
      .populate("coupon")
      .populate("items.product")
      .populate({
        path: "user",
        select: "name email status thumbnail phone address",
      })
      .sort({ createdAt: -1 });

    const orders = rawOrders.map((order) => {
      const flatItems = order.items.map((item) => {
        const product = item.product || {}; // fallback nếu null
        return {
          _id: item._id,
          productId: product._id,
          productName: product.productName,
          images: product.images,
          price: item.price,
          quantity: item.quantity,
          discount: item.discount,
        };
      });

      return {
        ...order.toObject(), // convert từ mongoose document về plain object
        items: flatItems,
      };
    });

    return new Pagination({
      limit: limit,
      skip: skip,
      result: orders,
      total: total,
    });
  };

  CheckOutWithPayload = async (payload, userId) => {
    let {
      paymentMethod,
      coupon,
      items,
      notes,
      addressLine,
      ward,
      phone,
      district,
      province,
      fullname,
      orderType,
    } = payload;

    if (!paymentMethod)
      throw new BadRequestError("Không có phương thức thanh toán");

    if (!items || items.length == 0)
      throw new BadRequestError("Đơn hàng không có sản phẩm nào.");

    let totalPrice = 0;

    const productIds = items.map((item) => item.productId);
    const products = await productModel.find({ _id: { $in: productIds } });

    if (products.length !== productIds.length)
      throw new BadRequestError("Sản phẩm không tồn tại");

    totalPrice = products.reduce((acc, product) => {
      const item = items.find((item) => item.productId == product._id);
      if (!item) return acc;

      const quantity = item.quantity;
      const discount = product.discount || 0;
      const priceAfterDiscount = product.price * (1 - discount / 100);
      const subtotal = priceAfterDiscount * quantity;

      return acc + subtotal;
    }, 0);

    let couponId = null;
    let discountValue = 0;

    let finalPrice = totalPrice;

    if (coupon) {
      const result = await validateAndApplyCoupon(coupon, null, totalPrice);
      couponId = result.couponId;
      discountValue = result.discountValue;
      finalPrice = result.finalPrice;
      const couponM = await couponModel.findById(couponId);
      if (!couponM) throw new BadRequestError("Mã giảm giá không tồn tại");
      couponM.usageLimit--;
    }

    const productMap = Object.fromEntries(
      products.map((product) => [product._id.toString(), product])
    );

    items = items.map((item) => {
      const product = productMap[item.productId];
      if (!product) {
        throw new Error(`Sản phẩm với ID ${item.productId} không tồn tại`);
      }

      return {
        product: item.productId,
        quantity: item.quantity,
        price: product.price,
        discount: product.discount,
      };
    });

    const order = new orderModel({
      items,
      totalPrice,
      finalPrice,
      status: ORDERSTATUS.PENDING,
      shippingAddress: {
        addressLine,
        district,
        phone,
        fullName: fullname,
        province,
        ward,
      },
      notes,
      paymentMethod,
      user: userId,
      coupon: couponId ?? null,
      isDeleted: false,
    });

    await order.save();

    order.orderType = orderType;
    const paymentHandler = PaymentHandler.getHandler(payload.paymentMethod);
    const res = await paymentHandler.handler(order, userId);

    return res;
  };

  GetOrderByMe = async (
    skip = 0,
    limit = 30,

    search = null,
    status = null,
    userId
  ) => {
    let filterX = { user: userId };
    if (search) {
      let regex = { $regex: search, $options: "i" };
    }

    if (status) {
      filterX.status = status;
    }
    const total = await orderModel.countDocuments(filterX);
    const rawOrders = await orderModel
      .find(filterX)
      .populate("coupon")
      .populate("items.product")
      .populate({
        path: "user",
        select: "name email status thumbnail phone address",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const orders = rawOrders.map((order) => {
      const flatItems = order.items.map((item) => {
        const product = item.product || {};
        const discount = item.discount || 0;

        return {
          _id: item._id,
          productId: product._id,
          productName: product.productName,
          images: product.images,
          price: item.price,
          quantity: item.quantity,
          discount: item.discount,
        };
      });

      return {
        ...order.toObject(),
        items: flatItems,
      };
    });

    return new Pagination({
      limit: limit,
      skip: skip,
      result: orders,
      total: total,
    });
  };
}

module.exports = new OrderService();
