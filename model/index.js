const sequelize = require("../orm");
const User = require("./User");
const Organisation = require("./Organisation");
const Activity = require("./Activity");
const Chat = require("./Chat");
const ChatMessage = require("./ChatMessage");

Organisation.belongsTo(User, { foreignKey: "ownerId" });

Activity.belongsTo(Organisation, {
  foreignKey: "hostOrganisationId",
  as: "hostOrganisation",
});
Organisation.hasMany(Activity, {
  foreignKey: "hostOrganisationId",
  as: "hostedActivities",
});

Activity.belongsTo(User, { foreignKey: "hostUserId", as: "hostUser" });
User.hasMany(Activity, { foreignKey: "hostUserId", as: "hostedActivities" });

User.belongsToMany(Activity, {
  through: "ActivityUsers",
  foreignKey: "userId",
  otherKey: "activityId",
  as: "activities",
});
Activity.belongsToMany(User, {
  through: "ActivityUsers",
  foreignKey: "activityId",
  otherKey: "userId",
  as: "users",
});

Chat.belongsTo(Activity, { foreignKey: "activityId" });
Activity.hasOne(Chat, { foreignKey: "activityId" });

Chat.belongsToMany(User, {
  through: "ChatUsers",
  foreignKey: "chatId",
  otherKey: "userId",
  as: "members",
});
User.belongsToMany(Chat, {
  through: "ChatUsers",
  foreignKey: "userId",
  otherKey: "chatId",
  as: "chats",
});

ChatMessage.belongsTo(Chat, { foreignKey: "chatId" });
Chat.hasMany(ChatMessage, { foreignKey: "chatId" });

ChatMessage.belongsTo(User, { foreignKey: "userId" });
User.hasMany(ChatMessage, { foreignKey: "userId" });

if (process.env.NODE_ENV === "production") {
  sequelize.sync(process.env.NODE_ENV === "production" ? { alter: true } : {});
}

module.exports = {
  sequelize,
  User,
  Organisation,
  Activity,
  Chat,
  ChatMessage,
};
