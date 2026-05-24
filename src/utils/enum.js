const ModelStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DELETED: "deleted",
};

const DISCOUNTTYPE = {
  PERCENT: "percent",
  FIXED: "fixed",
};

const ORDERSTATUS = {
  PENDING: "pending",
  PAID: "paid",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  DRAFT: "draft",
};

const PAYMENT_METHOD = {
  COD: "cod",
  ZALO: "zalo",
};

/** Trạng thái thanh toán (ZaloPay / online) — tách khỏi vòng đời đơn hàng `ORDERSTATUS` */
const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
};

const ROLE = {
  ADMIN: "A",
  CLIENT: "C",
};

const MEMBERSHIP_TIER = {
  BRONZE: "bronze",
  SILVER: "silver",
  GOLD: "gold",
  PLATINUM: "platinum",
};

// Sắp xếp từ cao → thấp để dùng trong getTierFromSpent
const TIER_CONFIG = [
  { tier: MEMBERSHIP_TIER.PLATINUM, minSpent: 10_000_000, discount: 0,  freeship: true,  voucher: true  },
  { tier: MEMBERSHIP_TIER.GOLD,     minSpent: 5_000_000,  discount: 5,  freeship: false, voucher: false },
  { tier: MEMBERSHIP_TIER.SILVER,   minSpent: 2_000_000,  discount: 3,  freeship: false, voucher: false },
  { tier: MEMBERSHIP_TIER.BRONZE,   minSpent: 0,           discount: 0,  freeship: false, voucher: false },
];

module.exports = {
  ModelStatus,
  DISCOUNTTYPE,
  ORDERSTATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  ROLE,
  MEMBERSHIP_TIER,
  TIER_CONFIG,
};
