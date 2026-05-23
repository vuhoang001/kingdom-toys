const couponModel = require("../../models/coupon.model");
const { BadRequestError } = require("../../response/error.response");
const {
  ExpiryDateHandler,
  MinOrderValueHandler,
  UsageLimitHandler,
} = require("../discountHandler/discount.handler");
const validateAndApplyCoupon = async (couponId, userId, totalPrice) => {
  if (!couponId)
    return { discountValue: 0, finalPrice: totalPrice, couponId: null };

  const coupon = await couponModel.findById(couponId);
  if (!coupon) throw new BadRequestError("Mã giảm giá không tồn tại");

  const expiryHandler = new ExpiryDateHandler();
  const minOrderHandler = new MinOrderValueHandler();
  const usageHandler = new UsageLimitHandler();

  expiryHandler.setNext(minOrderHandler).setNext(usageHandler);

  const context = { userId, totalPrice, coupon };
  await expiryHandler.handle(context);

  let discountValue = 0;

  if (coupon.CouponType === "percent") {
    discountValue = (totalPrice * coupon.CouponValue) / 100;
  } else if (coupon.CouponType === "fixed") {
    discountValue = coupon.CouponValue;
  }

  // Ensure discount không vượt quá totalPrice
  if (discountValue > totalPrice) discountValue = totalPrice;

  const finalPrice = totalPrice - discountValue;

  return {
    discountValue,
    finalPrice,
    couponValue: coupon.CouponValue,
    couponId: coupon._id,
  };
};

module.exports = { validateAndApplyCoupon };
