const { DISCOUNTTYPE } = require("../../utils/enum");

class PercentDiscount {
  constructor(discountValue) {
    this.discountValue = discountValue;
  }
  apply(cartTotal) {
    return cartTotal * (this.discountValue / 100);
  }
}

class FixedDiscount {
  constructor(discountValue) {
    this.discountValue = discountValue;
  }
  apply(cartTotal) {
    return this.discountValue;
  }
}

class DiscountFactory {
  static getDiscountValue(cartTotal, coupon) {
    if (!coupon) return 0;

    if (coupon.CouponType === DISCOUNTTYPE.PERCENT) {
      return new PercentDiscount(coupon.CouponValue).apply(cartTotal);
    }
    if (coupon.CouponType === DISCOUNTTYPE.FIXED) {
      return new FixedDiscount(coupon.CouponValue).apply(cartTotal);
    }
    return 0;
  }
}

module.exports = DiscountFactory;
