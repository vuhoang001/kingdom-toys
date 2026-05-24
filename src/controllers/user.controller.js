const { SuccessResponse } = require("../response/success.response");
const userService = require("../services/user.service");
const { convertURL } = require("../utils/index");

class UserController {
  Login = async (req, res) => {
    new SuccessResponse({
      message: "login success",
      metadata: await userService.Login(req.body),
    }).send(res);
  };

  Register = async (req, res) => {
    new SuccessResponse({
      message: "register success",
      metadata: await userService.Register(req.body),
    }).send(res);
  };

  HandleRF = async (req, res) => {
    new SuccessResponse({
      message: "handle rf success",
      metadata: await userService.HandleRefreshToken(
        req.user,
        req.refreshToken
      ),
    }).send(res);
  };

  GetMe = async (req, res) => {
    new SuccessResponse({
      message: "get me success",
      metadata: await userService.GetMe(req.user),
    }).send(res);
  };

  Update = async (req, res) => {
    let { images } = req.files;
    let items = JSON.parse(req.body.items);
    if (images) {
      items.thumbnail = convertURL(images)[0];
    }

    new SuccessResponse({
      message: "update success",
      metadata: await userService.Update(req.user.userId, items),
    }).send(res);
  };

  UpdatePassword = async (req, res) => {
    const user = req.user;
    new SuccessResponse({
      message: "Register success",
      metadata: await userService.UpdatePassword(req.body, user.userId),
    }).send(res);
  };

  GetUsers = async (req, res) => {
    const { skip, limit, search, tier } = req.query;
    new SuccessResponse({
      message: "get users success",
      metadata: await userService.GetUsers({ skip, limit, search, tier }),
    }).send(res);
  };
}

module.exports = new UserController();
