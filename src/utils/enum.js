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
module.exports = {
  ModelStatus,
  DISCOUNTTYPE,
  ORDERSTATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  ROLE,
};
