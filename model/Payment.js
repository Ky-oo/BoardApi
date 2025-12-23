const { DataTypes } = require("sequelize");

const sequelize = require("../orm");

const Payment = sequelize.define("Payment", {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  activityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  sessionId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  paymentIntentId: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: "eur",
  },
  status: {
    type: DataTypes.ENUM(
      "pending",
      "authorized",
      "paid",
      "refunded",
      "canceled"
    ),
    allowNull: false,
    defaultValue: "pending",
  },
  refundId: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

module.exports = Payment;
