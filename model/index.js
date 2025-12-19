const sequelize = require("../orm");
const User = require("./User");
const Organisation = require("./Organisation");
const Activity = require("./Activity");
const Chat = require("./Chat");
const ChatMessage = require("./ChatMessage");
const ChatMessageSeen = require("./ChatMessageSeen");

Organisation.belongsTo(User, {
  foreignKey: "ownerId",
  onDelete: "CASCADE",
});

Activity.belongsTo(Organisation, {
  foreignKey: "hostOrganisationId",
  as: "hostOrganisation",
  onDelete: "CASCADE",
});
Organisation.hasMany(Activity, {
  foreignKey: "hostOrganisationId",
  as: "hostedActivities",
  onDelete: "CASCADE",
});

Activity.belongsTo(User, {
  foreignKey: "hostUserId",
  as: "hostUser",
  onDelete: "CASCADE",
});
User.hasMany(Activity, {
  foreignKey: "hostUserId",
  as: "hostedActivities",
  onDelete: "CASCADE",
});

User.belongsToMany(Activity, {
  through: "ActivityUsers",
  foreignKey: "userId",
  otherKey: "activityId",
  as: "activities",
  onDelete: "CASCADE",
});
Activity.belongsToMany(User, {
  through: "ActivityUsers",
  foreignKey: "activityId",
  otherKey: "userId",
  as: "users",
  onDelete: "CASCADE",
});

Activity.belongsTo(Chat, {
  foreignKey: "chatId",
  as: "chat",
  onDelete: "SET NULL",
});
Chat.hasOne(Activity, {
  foreignKey: "chatId",
  as: "activity",
  onDelete: "CASCADE",
});

Chat.belongsToMany(User, {
  through: "ChatUsers",
  foreignKey: "chatId",
  otherKey: "userId",
  as: "members",
  onDelete: "CASCADE",
});
User.belongsToMany(Chat, {
  through: "ChatUsers",
  foreignKey: "userId",
  otherKey: "chatId",
  as: "chats",
  onDelete: "CASCADE",
});

ChatMessage.belongsTo(Chat, {
  foreignKey: "chatId",
  onDelete: "CASCADE",
});
Chat.hasMany(ChatMessage, {
  foreignKey: "chatId",
  onDelete: "CASCADE",
});

ChatMessage.belongsTo(User, {
  foreignKey: "userId",
  onDelete: "CASCADE",
});
User.hasMany(ChatMessage, {
  foreignKey: "userId",
  onDelete: "CASCADE",
});

ChatMessage.hasMany(ChatMessageSeen, {
  foreignKey: "messageId",
  as: "seenByUsers",
  onDelete: "CASCADE",
});
ChatMessageSeen.belongsTo(ChatMessage, {
  foreignKey: "messageId",
  onDelete: "CASCADE",
});
ChatMessageSeen.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
});
User.hasMany(ChatMessageSeen, {
  foreignKey: "userId",
  as: "seenMessages",
  onDelete: "CASCADE",
});

const syncNeedsAlter =
  process.env.SYNC_SCHEMA === "production" ||
  process.env.SYNC_SCHEMA === "alter" ||
  process.env.SYNC_SCHEMA === "true";

sequelize
  .sync(syncNeedsAlter ? { alter: true } : {})
  .then(() => console.log(`Sequelize sync ${syncNeedsAlter ? "(alter)" : ""} OK`))
  .catch((err) => {
    console.error("Sequelize sync error", err);
    process.exit(1);
  });

module.exports = {
  sequelize,
  User,
  Organisation,
  Activity,
  Chat,
  ChatMessage,
  ChatMessageSeen,
};
