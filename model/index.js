const sequelize = require("../orm");
const User = require("./User");
const Organisation = require("./Organisation");
const Activity = require("./Activity");
const Chat = require("./Chat");
const ChatMessage = require("./ChatMessage");

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

// sequelize.sync(
//   process.env.NODE_ENV === "production"
//     ? {}
//     : {
//         alter: true,
//       }
// );

module.exports = {
  sequelize,
  User,
  Organisation,
  Activity,
  Chat,
  ChatMessage,
};
