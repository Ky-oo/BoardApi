const { DataTypes } = require("sequelize");

const sequelize = require("../orm");

const GuestUserActivity = sequelize.define(
  "GuestUserActivity",
  {
    guestUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    activityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "GuestUserActivity",
    freezeTableName: true,
    indexes: [
      {
        unique: true,
        fields: ["guestUserId", "activityId"],
      },
    ],
  }
);

module.exports = GuestUserActivity;
