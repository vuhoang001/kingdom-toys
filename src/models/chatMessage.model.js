const { model, Schema } = require("mongoose");
const { ROLE } = require("../utils/enum");

const DOCUMENT_NAME = "ChatMessage";
const COLLECTION_NAME = "ChatMessages";

const chatMessageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    senderRole: {
      type: String,
      enum: [ROLE.ADMIN, ROLE.CLIENT],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isRead: {
      type: Boolean,
      default: false,
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

module.exports = model(DOCUMENT_NAME, chatMessageSchema);
