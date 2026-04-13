const { Schema, model, Types, mongo, default: mongoose } = require("mongoose");
const { ORDERSTATUS, PAYMENT_METHOD, PAYMENT_STATUS } = require("../utils/enum");

const DOCUMENT_NAME = "Order";
const COLLECTION_NAME = "Orders";

const OrderItemSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
});

const ShippingAddressSchema = new mongoose.Schema({
  fullName: String,
  phone: String,
  addressLine: String,
  ward: String,
  district: String,
  province: String,
});

const OrderSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    items: [OrderItemSchema],
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
    },
    status: {
      type: String,
      enum: Object.values(ORDERSTATUS),
      default: ORDERSTATUS.PENDING,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    totalPrice: Number,
    finalPrice: Number,
    shippingAddress: ShippingAddressSchema,
    paymentMethod: {
      type: String,
      enum: [PAYMENT_METHOD.COD, PAYMENT_METHOD.ZALO],
    },
    notes: String,
  },
  { timestamps: true, collection: COLLECTION_NAME }
);

module.exports = model(DOCUMENT_NAME, OrderSchema);
