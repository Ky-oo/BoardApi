const { DataTypes } = require("sequelize");

const sequelize = require("../orm");

const GuestUser = sequelize.define("GuestUser", {
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
});

module.exports = GuestUser;
