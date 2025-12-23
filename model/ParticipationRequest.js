const { DataTypes } = require("sequelize");

const sequelize = require("../orm");

const ParticipationRequest = sequelize.define(
  "ParticipationRequest",
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    activityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["userId", "activityId"],
      },
    ],
  }
);

module.exports = ParticipationRequest;
