const Product = require("../models/product.model");
const Genre = require("../models/genre.model");

const PRODUCT_FIELDS = "productName price discount quantity images";

const toJSON = (p) => ({
  _id: p._id,
  productName: p.productName,
  price: p.price,
  discount: p.discount ?? 0,
  finalPrice: Math.round(p.price * (1 - (p.discount ?? 0) / 100)),
  images: p.images ?? [],
  quantity: p.quantity,
});

// Tìm sản phẩm theo tên (entity: product-name)
const searchByName = async (keyword) => {
  if (!keyword) return null;

  const products = await Product.find({
    productName: { $regex: keyword, $options: "i" },
    quantity: { $gt: 0 },
  })
    .limit(5)
    .select(PRODUCT_FIELDS);

  if (!products.length)
    return { message: `Không tìm thấy sản phẩm nào liên quan đến "${keyword}".`, products: [] };

  return {
    message: `Tìm thấy ${products.length} sản phẩm cho "${keyword}":`,
    products: products.map(toJSON),
  };
};

// Sản phẩm mới nhất
const getNewProducts = async () => {
  const products = await Product.find({ quantity: { $gt: 0 } })
    .sort({ createdAt: -1 })
    .limit(5)
    .select(PRODUCT_FIELDS);

  if (!products.length)
    return { message: "Hiện chưa có sản phẩm nào.", products: [] };

  return {
    message: "Các sản phẩm mới nhất:",
    products: products.map(toJSON),
  };
};

// Sản phẩm đang giảm giá
const getDiscountedProducts = async () => {
  const products = await Product.find({
    discount: { $gt: 0 },
    quantity: { $gt: 0 },
  })
    .sort({ discount: -1 })
    .limit(5)
    .select(PRODUCT_FIELDS);

  if (!products.length)
    return { message: "Hiện không có sản phẩm nào đang giảm giá.", products: [] };

  return {
    message: "Các sản phẩm đang giảm giá:",
    products: products.map(toJSON),
  };
};

// Hỏi giá sản phẩm cụ thể (entity: product-name)
const getProductPrice = async (keyword) => {
  if (!keyword) return null;

  const product = await Product.findOne({
    productName: { $regex: keyword, $options: "i" },
  }).select(PRODUCT_FIELDS);

  if (!product)
    return { message: `Không tìm thấy sản phẩm "${keyword}" trong hệ thống.`, products: [] };

  return {
    message: `Đây là thông tin giá sản phẩm "${product.productName}":`,
    products: [toJSON(product)],
  };
};

// Danh sách thể loại (không trả products)
const getGenres = async () => {
  const genres = await Genre.find({ status: "active" }).select("genreName");

  if (!genres.length)
    return { message: "Hiện chưa có thể loại nào.", products: [] };

  const list = genres.map((g) => `• ${g.genreName}`).join("\n");
  return { message: `Các thể loại đồ chơi hiện có:\n${list}`, products: [] };
};

// Map tên chuẩn entity price-range → { min, max, label }
const PRICE_RANGE_MAP = {
  "duoi-200k": { min: 0,       max: 200000,  label: "dưới 200.000đ" },
  "200k-500k": { min: 200000,  max: 500000,  label: "200.000đ – 500.000đ" },
  "500k-1tr":  { min: 500000,  max: 1000000, label: "500.000đ – 1.000.000đ" },
  "1tr-2tr":   { min: 1000000, max: 2000000, label: "1.000.000đ – 2.000.000đ" },
  "2tr-5tr":   { min: 2000000, max: 5000000, label: "2.000.000đ – 5.000.000đ" },
};

// Sản phẩm theo khoảng giá (entity: price-range)
const getProductsByPriceRange = async (rangeValue) => {
  if (!rangeValue) return null;

  const range = PRICE_RANGE_MAP[rangeValue];
  if (!range)
    return { message: `Không nhận ra khoảng giá "${rangeValue}".`, products: [] };

  const finalPriceExpr = {
    $multiply: [
      "$price",
      { $subtract: [1, { $divide: [{ $ifNull: ["$discount", 0] }, 100] }] },
    ],
  };

  const products = await Product.find({
    quantity: { $gt: 0 },
    $expr: {
      $and: [
        { $gte: [finalPriceExpr, range.min] },
        { $lte: [finalPriceExpr, range.max] },
      ],
    },
  })
    .limit(5)
    .select(PRODUCT_FIELDS);

  if (!products.length)
    return { message: `Hiện không có sản phẩm nào trong khoảng giá ${range.label}.`, products: [] };

  return {
    message: `Sản phẩm trong khoảng giá ${range.label}:`,
    products: products.map(toJSON),
  };
};

// Sản phẩm theo thể loại (entity: genre-name)
const getProductsByGenre = async (genreName) => {
  if (!genreName) return null;

  const genre = await Genre.findOne({
    genreName: { $regex: genreName, $options: "i" },
    status: "active",
  });
  if (!genre)
    return { message: `Không tìm thấy thể loại "${genreName}".`, products: [] };

  const products = await Product.find({
    genre: genre._id,
    quantity: { $gt: 0 },
  })
    .limit(5)
    .select(PRODUCT_FIELDS);

  if (!products.length)
    return { message: `Thể loại "${genre.genreName}" hiện chưa có sản phẩm nào.`, products: [] };

  return {
    message: `Sản phẩm thuộc thể loại "${genre.genreName}":`,
    products: products.map(toJSON),
  };
};

module.exports = {
  searchByName,
  getNewProducts,
  getDiscountedProducts,
  getProductPrice,
  getGenres,
  getProductsByGenre,
  getProductsByPriceRange,
};
