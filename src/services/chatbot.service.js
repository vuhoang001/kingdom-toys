const dialogflow = require("dialogflow");
const { v4: uuidv4 } = require("uuid");
const db = require("./chatbot.db");

const projectId = process.env.DIALOGFLOW_PROJECT_ID;

const getSessionClient = () => {
  const credentials = {
    client_email: process.env.DIALOGFLOW_CLIENT_EMAIL,
    private_key: process.env.DIALOGFLOW_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };
  return new dialogflow.SessionsClient({ credentials });
};

// Lấy giá trị string đầu tiên từ parameters của Dialogflow
const getParam = (fields, key) => {
  const field = fields[key];
  if (!field) return null;
  return field.stringValue || field.listValue?.values?.[0]?.stringValue || null;
};

// Map intent → hàm xử lý DB
const handleIntent = async (intent, parameters) => {
  switch (intent) {
    case "tim.san.pham":
      return db.searchByName(getParam(parameters, "product-name"));

    case "hoi.gia":
      return db.getProductPrice(getParam(parameters, "product-name"));

    case "hoi.san.pham.moi":
      return db.getNewProducts();

    case "hoi.khuyen.mai":
    case "hoi.san.pham.giam.gia":
      return db.getDiscountedProducts();

    case "hoi.the.loai":
      return db.getGenres();

    case "hoi.san.pham.theo.the.loai":
      return db.getProductsByGenre(getParam(parameters, "genre-name"));

    case "hoi.gia.theo.khoang":
      return db.getProductsByPriceRange(getParam(parameters, "price-range"));

    default:
      return null;
  }
};

const detectIntent = async ({ message, sessionId }) => {
  const sessionClient = getSessionClient();
  const session = sessionClient.sessionPath(projectId, sessionId || uuidv4());

  const request = {
    session,
    queryInput: {
      text: {
        text: message,
        languageCode: process.env.DIALOGFLOW_LANGUAGE_CODE || "vi",
      },
    },
  };

  const [response] = await sessionClient.detectIntent(request);
  const result = response.queryResult;

  const intent = result.intent?.displayName;
  const parameters = result.parameters?.fields || {};

  const dbResponse = await handleIntent(intent, parameters);

  return {
    fulfillmentText: dbResponse?.message ?? result.fulfillmentText,
    products: dbResponse?.products ?? [],
    intent,
    confidence: result.intentDetectionConfidence,
    parameters,
  };
};

module.exports = { detectIntent };
