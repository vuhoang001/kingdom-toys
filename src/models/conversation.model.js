const { model, Schema } = require("mongoose");

const DOCUMENT_NAME = "Conversation";
const COLLECTION_NAME = "Conversations";

const conversationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    unreadByAdmin: {
      type: Number,
      default: 0,
    },
    unreadByUser: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: COLLECTION_NAME,
  }
);

module.exports = model(DOCUMENT_NAME, conversationSchema);
