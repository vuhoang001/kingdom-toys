const brandModel = require("../models/brand.model");
const {
  BadRequestError,
  NotFoundError,
} = require("../response/error.response");

class BrandServices {
  Create = async (data) => {
    const result = await brandModel.create(data);
    return result;
  };
  Update = async (id, data) => {
    const holder = await brandModel.findOne({ _id: id });
    if (!holder) throw new NotFoundError("not found datas");
    const result = await brandModel.updateOne({ _id: id }, data);
    return result;
  };
  Delete = async (id) => {
    const holder = await brandModel.findOne({ _id: id });
    if (!holder) throw new NotFoundError("not found datas");
    await brandModel.deleteOne({ _id: id });
    return true;
  };
  GetAll = async (search = null, skip = 0, limit = 30) => {
    let filter = {};
    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter = {
        $or: [{ brandName: regex }],
      };
    }
    const reslt = await brandModel.find(filter).skip(skip).limit(limit);
    return reslt;
  };

  GetById = async (id) => {
    const holder = await brandModel.findOne({ _id: id });
    return holder;
  };
}

module.exports = new BrandServices();
