const { DataTypes } = require("sequelize");

const sequelize = require("../orm");

const Organisation = sequelize.define("Organisation", {
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
});

module.exports = Organisation;
