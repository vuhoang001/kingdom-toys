const { model, Schema, Types } = require("mongoose");
const { ROLE } = require("../utils/enum");

const DOCUMENT_NAME = "Account";
const COLLECTION_NAME = "Accounts";

const accountSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      maxLength: 150,
    },
    email: {
      type: String,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "deleted"],
      default: "active",
    },
    thumbnail: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
    },
    addressLine: {
      type: String,
    },
    role: {
      type: String,
      enum: [ROLE.ADMIN, ROLE.CLIENT],
      default: ROLE.CLIENT,
    },
    ward: String,
    district: String,
    province: String,
  },
  {
    timestamps: true,
    collection: COLLECTION_NAME,
  }
);

module.exports = model(DOCUMENT_NAME, accountSchema);
