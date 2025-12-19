const { DataTypes } = require("sequelize");

const sequelize = require("../orm");

const ChatMessageSeen = sequelize.define(
  "ChatMessageSeen",
  {
    messageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    seenAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["messageId", "userId"],
      },
    ],
  }
);

module.exports = ChatMessageSeen;
