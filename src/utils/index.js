const _ = require("lodash");
const { Types } = require("mongoose");

const URL_IMG = `${process.env.URL_SERVER}/uploads`;

const convertURL = (images) => {
  return images.map((image) => `${URL_IMG}/${image.filename}`);
};

const getInfoData = ({ fields = [], object = {} }) => {
  return _.pick(object, fields);
};

const convertToObjectIdMongose = (id) => {
  return new Types.ObjectId(id);
};

// ['a', 'b', 'c'] = {a: 1, b: 1, c: 1}
const getSelectData = (select = []) => {
  return Object.fromEntries(select.map((el) => [el, 1]));
};

const getUnSelectData = (select = []) => {
  return Object.fromEntries(select.map((el) => [el, 0]));
};

const cleanObject = (obj) => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  Object.keys(obj).forEach((key) => {
    if (obj[key] === null || obj[key] === undefined) {
      delete obj[key];
    } else if (typeof obj[key] === "object") {
      cleanObject(obj[key]);
    }
  });

  return obj;
};

const parseFilterString = (filterString, search = null, searchFields = []) => {
  if (!filterString || typeof filterString !== "string") return {};

  // Chuyển đổi filter thành object
  const filterObj = _.chain(filterString.split("&"))
    .map((pair) => pair.split("="))
    .fromPairs()
    .mapValues((value) => ({ $regex: new RegExp(value, "i") }))
    .value();

  // Nếu có search và danh sách trường cần tìm kiếm
  if (search && searchFields.length > 0) {
    const searchRegex = new RegExp(search, "i");
    filterObj.$or = searchFields.map((field) => ({ [field]: searchRegex }));
  }

  return filterObj;
};

const parsePriceToFilter = (price) => {
  if (!price) return null;

  const ranges = String(price).split(",");
  const orConditions = ranges.map((range) => {
    if (!range.includes(":")) {
      // Giá trị đơn → lọc giá tối đa (price <= value)
      const max = Number(range);
      return isNaN(max) ? null : { price: { $lte: max } };
    }

    const [rawMin, rawMax] = range.split(":");
    const min = rawMin !== "" ? Number(rawMin) : null;
    const max = rawMax !== "" ? Number(rawMax) : null;

    const condition = {};
    if (min !== null && !isNaN(min)) condition.$gte = min;
    if (max !== null && !isNaN(max)) condition.$lte = max;

    return Object.keys(condition).length ? { price: condition } : null;
  }).filter(Boolean);

  if (!orConditions.length) return null;
  return orConditions.length > 1 ? { $or: orConditions } : orConditions[0];
};

module.exports = {
  parsePriceToFilter,
  parseFilterString,
  getInfoData,
  getSelectData,
  getUnSelectData,
  cleanObject,
  convertToObjectIdMongose,
  convertURL,
};
