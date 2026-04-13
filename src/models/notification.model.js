const { Schema, model } = require("mongoose");

const DOCUMENT_NAME = "Notification";
const COLLECTION_NAME = "Notifications";

const notificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    type: {
      type: String,
      default: "order_updated",
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    data: {
      orderId: {
        type: Schema.Types.ObjectId,
        ref: "Order",
      },
      status: {
        type: String,
        trim: true,
      },
      paymentStatus: {
        type: String,
        trim: true,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: COLLECTION_NAME,
  }
);

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = model(DOCUMENT_NAME, notificationSchema);
