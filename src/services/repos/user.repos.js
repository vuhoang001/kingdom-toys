const userModel = require("../../models/user.model");
const { getTierFromSpent } = require("../../utils");

const GetUserById = async (id) => {
  return userModel.findOne({ _id: id });
};

const updateUserMembership = async (userId, spentAmount) => {
  const user = await userModel.findByIdAndUpdate(
    userId,
    { $inc: { totalSpent: spentAmount } },
    { new: true }
  );
  if (!user) return;

  const newTier = getTierFromSpent(user.totalSpent);
  if (newTier !== user.membershipTier) {
    user.membershipTier = newTier;
    await user.save();
  }
  return user;
};

module.exports = { GetUserById, updateUserMembership };
