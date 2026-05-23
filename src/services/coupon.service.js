const couponModel = require("../models/coupon.model");
const { BadRequestError } = require("../response/error.response");
const { Pagination } = require("../response/success.response");
const cartModel = require("../models/cart.model");
const { parseFilterString } = require("../utils");
const { DISCOUNTTYPE } = require("../utils/enum");
const productModel = require("../models/product.model");
const {
  validateAndApplyCoupon,
} = require("./ValidateOrder/validateAndApplyCoupon");
const {
  ExpiryDateHandler,
  MinOrderValueHandler,
  UsageLimitHandler,
} = require("./discountHandler/discount.handler");

class CouponService {
  CheckingCoupon = async (userId) => {
    const cart = await cartModel.findOne({ user: userId });
    if (!cart) throw new BadRequestError("Không tìm thấy giỏ hàng");

    const cartTotal = cart.finalPrice ?? cart.totalPrice ?? 0;

    const validCoupons = await couponModel.find({
      expiryDate: { $gt: new Date() },
      usageLimit: { $gt: 0 },
      minOrderValue: { $lte: cartTotal },
    });

    if (validCoupons.length === 0)
      throw new BadRequestError("Không có mã giảm giá hợp lệ");

    return validCoupons;
  };

  ApplyCoupon = async (payload) => {
    const { items } = payload;
    const productIds = items.map((item) => item.productId);

    const products = await productModel.find({
      _id: { $in: productIds },
    });
    if (products.length !== productIds.length)
      throw new BadRequestError(
        "Sản phẩm không tồn tại hoặc đã bị vô hiệu hóa"
      );

    const itemMap = new Map(
      items.map((item) => [item.productId.toString(), item])
    );

    const totalPrice = products.reduce((acc, product) => {
      const item = itemMap.get(product._id.toString());
      if (!item || item.quantity <= 0) return acc;

      const discount = product.discount || 0;

      const priceAfterDiscount = product.price * (1 - discount / 100);

      const subtotal = priceAfterDiscount * item.quantity;
      return acc + subtotal;
    }, 0);

    const { couponId, discountValue, couponValue, finalPrice } =
      await validateAndApplyCoupon(payload.coupon, null, totalPrice);

    return { couponId, discountValue, finalPrice, totalPrice, couponValue };
  };

  AddCoupon = async (data) => {
    const coupon = await couponModel.findOne({ CouponName: data.CouponName });
    if (coupon) throw new BadRequestError("Đã có coupon này rồi!");

    const couponSave = new couponModel(data);

    await couponSave.save();
    return couponSave;
  };

  UpdateCoupon = async (couponId, UpdatedData) => {
    const coupon = await couponModel.findOne({ _id: couponId });
    if (!coupon) throw new BadRequestError("Không tìm thấy coupon!");

    Object.assign(coupon, UpdatedData);

    await coupon.save();
    return coupon;
  };

  GetCouponById = async (couponId) => {
    const coupon = await couponModel.findOne({ _id: couponId });
    if (!coupon) throw new BadRequestError("Không tìm thấy coupon!");
    return coupon;
  };

  DeleteCoupon = async (couponId) => {
    const coupon = await couponModel.findOne({ _id: couponId });

    if (!coupon) throw new BadRequestError("Không tìm thấy coupon");

    await coupon.deleteOne();
    return "success";
  };

  GetCoupon = async (search = null, skip = 0, limit = 30) => {
    let filter = {};
    if (search) {
      const regex = { $regex: search.toString(), $options: "i" };
      filter = {
        $or: [{ CouponName: regex }],
      };
    }
    const total = await couponModel.countDocuments(filter);
    let coupon = await couponModel.find(filter).skip(skip).limit(limit);
    if (!coupon) throw new BadRequestError("Không tìm thấy coupon");

    return new Pagination({
      limit,
      skip,
      result: coupon,
      total,
    });
  };
}
module.exports = new CouponService();
