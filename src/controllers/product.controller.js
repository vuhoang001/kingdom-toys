const productService = require("../services/product.service");
const { SuccessResponse } = require("../response/success.response");
const { convertURL } = require("../utils");

class ProductController {
  GetAll = async (req, res) => {
    const {
      skip, limit, filter, search, price,
      genre, sex, age, type,
      brand, madeIn, minDiscount, maxDiscount, inStock, sort,
    } = req.query;
    new SuccessResponse({
      message: "Get all success",
      metadata: await productService.GetAll(
        skip, limit, filter, search, price,
        genre, sex, age, type,
        brand, madeIn, minDiscount, maxDiscount, inStock, sort
      ),
    }).send(res);
  };

  GetByBrand = async (req, res) => {
    const { name, skip, limit } = req.params;

    new SuccessResponse({
      message: "Get by brand",
      metadata: await productService.GetProductByName(name, skip, limit),
    }).send(res);
  };

  GetById = async (req, res) => {
    const id = req.params.id;
    new SuccessResponse({
      message: "Get by id success",
      metadata: await productService.GetById(id),
    }).send(res);
  };

  Create = async (req, res) => {
    const { images } = req.files;
    const items = JSON.parse(req.body.items);
    if (images) items.images = convertURL(images);

    new SuccessResponse({
      message: "create success",
      metadata: await productService.Create(items),
    }).send(res);
  };

  Update = async (req, res) => {
    const id = req.params.id;
    const { images } = req.files;
    const items = JSON.parse(req.body.items);
    if (images) {
      items.images = convertURL(images);
    }

    new SuccessResponse({
      metadata: await productService.Update(id, items),
    }).send(res);
  };

  Delete = async (req, res) => {
    const id = req.params.id;
    new SuccessResponse({
      metadata: await productService.Delete(id),
    }).send(res);
  };

  AddComment = async (req, res) => {
    const productId = req.params.id;
    const user = req.user;
    new SuccessResponse({
      message: "Add comment success",
      metadata: await productService.AddComment(
        productId,
        req.body,
        user.userId
      ),
    }).send(res);
  };

  RemoveComment = async (req, res) => {
    const productId = req.params.id;
    const commentId = req.params.commentId;
    const user = req.user;
    new SuccessResponse({
      message: "RemoveComment",
      metadata: await productService.RemoveComment(
        productId,
        commentId,
        user.userId
      ),
    }).send(res);
  };
}

module.exports = new ProductController();
