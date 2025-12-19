const { DataTypes } = require("sequelize");

const sequelize = require("../orm");

const ChatMessage = sequelize.define("ChatMessage", {
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});

module.exports = ChatMessage;
