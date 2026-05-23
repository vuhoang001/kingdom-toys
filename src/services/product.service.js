const productModel = require("../models/product.model");
const genreModel = require("../models/genre.model");
const brandModel = require("../models/brand.model");
const { parsePriceToFilter, convertToObjectIdMongose } = require("../utils");
const { Pagination } = require("../response/success.response");
const { BadRequestError } = require("../response/error.response");

class ProductService {
  GetAll = async (
    skip = 0,
    limit = 30,
    filter = null,
    search = "",
    price = null,
    genre = null,
    sex = null,
    age = null,
    type = null,
    brand = null,
    madeIn = null,
    minDiscount = null,
    maxDiscount = null,
    inStock = null,
    sort = null
  ) => {
    const andConditions = [];

    const searchStr = String(search ?? "").trim();
    if (searchStr) {
      andConditions.push({
        $or: [
          { productName: { $regex: searchStr, $options: "i" } },
          { descriptions: { $regex: searchStr, $options: "i" } },
        ],
      });
    }

    const priceFilter = parsePriceToFilter(price);
    if (priceFilter) andConditions.push(priceFilter);

    if (genre) andConditions.push({ genre });
    if (brand) andConditions.push({ brand });

    if (sex) andConditions.push({ sex });

    if (type) andConditions.push({ type: { $regex: type, $options: "i" } });

    if (madeIn) andConditions.push({ madeIn: { $regex: madeIn, $options: "i" } });

    if (age) {
      if (String(age).includes(":")) {
        const [minAge, maxAge] = String(age).split(":").map(Number);
        andConditions.push({ age: { $gte: minAge, $lte: maxAge } });
      } else {
        andConditions.push({ age: Number(age) });
      }
    }

    if (minDiscount || maxDiscount) {
      const discountCondition = {};
      if (minDiscount) discountCondition.$gte = Number(minDiscount);
      if (maxDiscount) discountCondition.$lte = Number(maxDiscount);
      andConditions.push({ discount: discountCondition });
    }

    if (inStock === "true") andConditions.push({ quantity: { $gt: 0 } });
    if (inStock === "false") andConditions.push({ quantity: 0 });

    const baseFilter = andConditions.length ? { $and: andConditions } : {};

    const SORT_MAP = {
      price_asc:      { price: 1 },
      price_desc:     { price: -1 },
      discount_desc:  { discount: -1 },
      newest:         { createdAt: -1 },
      oldest:         { createdAt: 1 },
    };
    const sortOption = SORT_MAP[sort] ?? { createdAt: -1 };

    const total = await productModel.countDocuments(baseFilter);
    const products = await productModel
      .find(baseFilter)
      .populate("genre")
      .populate("brand")
      .sort(sortOption)
      .skip(Number(skip))
      .limit(Number(limit));

    return new Pagination({
      limit: Number(limit),
      skip: Number(skip),
      result: products,
      total: total,
    });
  };

  GetProductByName = async (name, skip, limit) => {
    const genre = await genreModel.findOne({
      genreName: { $regex: name, $options: "i" },
    });

    if (!genre) throw new BadRequestError("Không tìm thấy thương hiệu phù hợp");

    const products = await productModel
      .find({ genre: genre._id })
      .skip(skip)
      .limit(limit)
      .populate("brand");

    return products;
  };

  GetById = async (id) => {
    const product = await productModel
      .findOne({
        _id: convertToObjectIdMongose(id),
      })
      .populate("brand")
      .populate("genre")
      .populate({
        path: "comments.user",
      });

    return product;
  };

  Update = async (id, data) => {
    const productUpdated = await productModel.updateOne({ _id: id }, data);
    return productUpdated;
  };

  Delete = async (id) => {
    const productDeleted = await productModel.deleteOne({ _id: id });
    return productDeleted;
  };

  Create = async (data) => {
    const newProduct = await productModel.create(data);
    return newProduct;
  };

  AddComment = async (id, payload, user) => {
    const { content, rating } = payload;

    const product = await productModel.findOne({ _id: id });
    if (!product) throw new BadRequestError("Thêm bình luận");

    product.comments.push({
      user: user,
      content: content,
      rating: rating,
    });

    await product.save();
    return "Success";
  };

  RemoveComment = async (id, commentId, user) => {
    const product = await productModel.findOne({ _id: id });
    if (!product) throw new BadRequestError("Không tìm thấy sản phẩm");

    const commentIndex = product.comments.findIndex(
      (comment) =>
        comment._id.toString() === commentId &&
        comment.user.toString() === user.toString()
    );

    if (commentIndex == -1)
      throw new BadRequestError("Không tìm thấy bình luộn");

    product.comments.pull({ _id: commentId });

    await product.save();

    return "Comment removed successfully";
  };
}

module.exports = new ProductService();
