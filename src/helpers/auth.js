const jwt = require("jsonwebtoken");
const { AsyncHandle } = require("./AsyncHandle");
const { AuthFailureError } = require("../response/error.response");
const userService = require("../services/user.service");
const HEADER = {
  AUTHORIZATION: "authorization",
  REFRESHTOKEN: "x-rtoken-id",
};
const { GetUserById } = require("../services/repos/user.repos");
const { ROLE } = require("../utils/enum");

const createTokenPair = async (payload) => {
  try {
    accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN, {
      expiresIn: "2 days",
    });
    refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN, {
      expiresIn: "7 days",
    });

    const rTokenTime = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);
    const aTokenTime = jwt.verify(accessToken, process.env.ACCESS_TOKEN);
    return { accessToken, refreshToken, aTokenTime, rTokenTime };
  } catch (error) {
    return error;
  }
};

const authentication = AsyncHandle(async (req, res, next) => {
  const Bearer = req.headers[HEADER.AUTHORIZATION];
  const refreshToken = req.headers[HEADER.REFRESHTOKEN];
  let accessToken;

  if (Bearer) accessToken = Bearer.split(" ")[1];

  if (!refreshToken && !accessToken)
    throw new AuthFailureError("Authentication error");

  if (refreshToken) {
    const decodeUser = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);

    const holderUser = await GetUserById(decodeUser.userId);
    if (!holderUser) throw new AuthFailureError("Authentication error");
    req.user = decodeUser;
    req.refreshToken = refreshToken;
  }

  if (accessToken) {
    const decodeUser = jwt.verify(accessToken, process.env.ACCESS_TOKEN);

    const holderAccount = await await GetUserById(decodeUser.userId);
    if (!holderAccount) throw new AuthFailureError("Authentication error");

    req.user = decodeUser;
  }

  next();
});

const requireAdmin = AsyncHandle(async (req, res, next) => {
  const user = await GetUserById(req.user.userId);
  if (!user || user.role !== ROLE.ADMIN)
    throw new AuthFailureError("Forbidden: admin only");
  next();
});

module.exports = { createTokenPair, authentication, requireAdmin };
