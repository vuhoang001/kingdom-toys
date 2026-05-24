const AccountModel = require("../models/user.model");
const keyTokenService = require("./keyToken.service");
const { createTokenPair } = require("../helpers/auth");
const { getInfoData, convertToObjectIdMongose } = require("../utils/index");
const {
  AuthFailureError,
  BadRequestError,
} = require("../response/error.response");
const { Pagination } = require("../response/success.response");
const bcrypt = require("bcrypt");

class UserService {
  GetMe = async (user) => {
    const response = await AccountModel.findOne({ _id: user.userId }).select(
      "-password"
    );
    return response;
  };

  UpdatePassword = async (payload, user) => {
    const { password, newPassword } = payload;
    const holderAccount = await AccountModel.findOne({ _id: user });
    if (!holderAccount) throw new BadRequestError("Có lỗi khi tạo tài khoản");
    const isMatch = await bcrypt.compare(password, holderAccount.password);
    if (!isMatch) throw new BadRequestError("Đổi mật khẩu lỗi");

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    holderAccount.password = hashedPassword;
    await holderAccount.save();

    return "Đổi mật khẩu thành công";
  };

  Login = async ({ username, password }) => {
    const foundAccount = await AccountModel.findOne({ email: username });
    if (!foundAccount) throw new AuthFailureError("Tài khoản chưa được đăng ký");

    const matchAccount = await bcrypt.compare(password, foundAccount.password);
    if (!matchAccount) throw new AuthFailureError("Tài khoản hoặc mật khẩu không chính xác");

    const tokens = await createTokenPair({
      userId: foundAccount._id,
      email: foundAccount.email,
    });

    if (!tokens) throw new BadRequestError("Không thể tạo Tokens");

    const keyStore = await keyTokenService.createKeys({
      user: foundAccount,
      refreshToken: tokens.refreshToken,
    });
    if (!keyStore) throw new AuthFailureError("Không thể tạo Keytoken");

    return {
      user: getInfoData({
        fields: ["_id", "name", "email", "thumbnail", "role"],
        object: foundAccount,
      }),
      accessToken: tokens.accessToken,
      atokenExp: tokens.aTokenTime.exp,
      refreshToken: tokens.refreshToken,
      rtokenExp: tokens.rTokenTime.exp,
    };
  };

  Register = async ({ name, email, password }) => {
    const holderAccount = await AccountModel.findOne({ email: email });
    if (holderAccount) throw new AuthFailureError("Tài khoản đã tồn tại trong hệ thống");

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAccount = await AccountModel.create({
      name: name,
      email: email,
      password: hashedPassword,
    });

    if (!newAccount) throw new AuthFailureError("Không thể tạo tài khoản");

    return {
      user: getInfoData({
        fields: ["_id", "name", "email"],
        object: newAccount,
      }),
    };
  };

  GetUsers = async ({ skip = 0, limit = 20, search = null, tier = null } = {}) => {
    const filter = {};
    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [{ name: regex }, { email: regex }];
    }
    if (tier) filter.membershipTier = tier;

    const total = await AccountModel.countDocuments(filter);
    const users = await AccountModel.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    return new Pagination({ limit, skip, result: users, total });
  };

  GetUserById = async (id) => {
    return await AccountModel.findOne({ _id: convertToObjectIdMongose(id) });
  };

  Update = async (id, data) => {
    const holderAccount = await AccountModel.findOne({
      _id: convertToObjectIdMongose(id),
    });
    if (!holderAccount) throw new AuthFailureError("Không tìm được tài khoản");

    Object.assign(holderAccount, data);

    await holderAccount.save();
    return holderAccount;
  };

  seedData = async () => {
    const data = AccountModel.findOne({ email: "admin@gmail.com" });
    if (data) return;

    const hashedPasswordAdmin = await bcrypt.hash("123", 10);
    const hashedPasswordClient = await bcrypt.hash("123", 10);
    await AccountModel.insertMany([
      {
        name: "Admin",
        email: "admin@gmail.com",
        password: hashedPasswordAdmin,
        role: "A",
      },
      {
        name: "Client",
        email: "client@gmail.com",
        password: hashedPasswordClient,
        role: "C",
      },
    ]);

    return 1;
  };

  HandleRefreshToken = async (user, refreshToken) => {
    const userId = user.userId;
    const email = user.email;

    const keyStore = await keyTokenService.findKeyTokenByRefreshToken(
      refreshToken
    );
    if (!keyStore) throw new AuthFailureError("Không tìm thấy Key store");

    if (keyStore.refreshTokenUsed.includes(refreshToken)) {
      await keyTokenService.removeKeyTokenByUserId(userId);
      throw new AuthFailureError("please relogin");
    }

    const foundUser = await AccountModel.findOne({ email });
    if (!foundUser) throw new AuthFailureError("please relogin");

    const tokens = await createTokenPair({
      userId: foundUser._id,
      email: foundUser.email,
    });

    if (!tokens) throw new AuthFailureError("please relogin");

    const holerTokens = await keyTokenService.findKeyTokenByUserId(
      foundUser._id
    );

    if (!holerTokens) throw new AuthFailureError("please relogin");

    const res = await holerTokens.updateOne({
      $set: {
        refreshToken: tokens.refreshToken,
      },
      $addToSet: {
        refreshTokenUsed: refreshToken,
      },
    });

    if (!res) throw new AuthFailureError("please relogin");
    return {
      user: getInfoData({
        fields: ["_id", "name", "email"],
        object: foundUser,
      }),
      accessToken: tokens.accessToken,
      atokenExp: tokens.aTokenTime.exp,
      refreshToken: tokens.refreshToken,
      rtokenExp: tokens.rTokenTime.exp,
    };
  };
}

module.exports = new UserService();
