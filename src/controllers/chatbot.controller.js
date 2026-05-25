const { SuccessResponse } = require("../response/success.response");
const { BadRequestError } = require("../response/error.response");
const { detectIntent } = require("../services/chatbot.service");

const sendMessage = async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || !message.trim()) {
    throw new BadRequestError("message is required");
  }

  const result = await detectIntent({ message: message.trim(), sessionId });

  new SuccessResponse({
    message: "OK",
    metadata: result,
  }).send(res);
};

module.exports = { sendMessage };
