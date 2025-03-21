const { SuccessResponse } = require("../response/success.response");
const couponService = require("../services/coupon.service");

class CouponController {
  AddCoupon = async (req, res) => {
    new SuccessResponse({
      message: "Create Success",
      metadata: await couponService.AddCoupon(req.body),
    }).send(res);
  };

  UpdateConpon = async (req, res) => {
    const id = req.params.id;
    new SuccessResponse({
      message: "Update success",
      metadata: await couponService.UpdateCoupon(id, req.body),
    }).send(res);
  };

  DeleteCoupon = async (req, res) => {
    const id = req.params.id;
    new SuccessResponse({
      message: "DeleteCoupon",
      metadata: await couponService.DeleteCoupon(id),
    }).send(res);
  };

  GetCoupon = async (req, res) => {
    new SuccessResponse({
      message: "Get all success",
      metadata: await couponService.GetCoupon(),
    }).send(res);
  };

  ApplyCoupon = async (req, res) => {
    const id = req.params.id;
    const user = req.user;
    new SuccessResponse({
      message: "Apply success",
      metadata: await couponService.ApplyCoupon(id, user.userId),
    }).send(res);
  };

  CheckingCoupon = async (req, res) => {
    const user = req.user;

    new SuccessResponse({
      message: "Checking coupon",
      metadata: await couponService.CheckingCoupon(user.userId),
    }).send(res);
  };
}

module.exports = new CouponController();
