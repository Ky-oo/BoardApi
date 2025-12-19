const {
  Activity,
  Chat,
  ChatMessageSeen,
  Organisation,
  User,
} = require("../model");

const membershipInclude = [
  {
    model: User,
    as: "users",
    attributes: ["id"],
    through: { attributes: [] },
  },
  {
    model: User,
    as: "hostUser",
    attributes: ["id"],
  },
  {
    model: Organisation,
    as: "hostOrganisation",
    attributes: ["id", "ownerId"],
  },
  {
    model: Chat,
    as: "chat",
  },
];

const messageInclude = [
  {
    model: User,
    attributes: ["id", "firstname", "lastname", "pseudo"],
  },
  {
    model: ChatMessageSeen,
    as: "seenByUsers",
    attributes: ["userId"],
  },
];

const formatUserName = (user) => {
  if (!user) return "";
  if (user.pseudo) return user.pseudo;
  return [user.firstname, user.lastname].filter(Boolean).join(" ").trim();
};

const serializeMessage = (message) => ({
  id: message.id,
  userId: message.userId,
  userName: formatUserName(message.User),
  content: message.content,
  createdAt: message.createdAt,
  seenBy: (message.seenByUsers || []).map((record) => record.userId),
});

const ensureChatForActivity = async (activity) => {
  let chat = await activity.getChat();
  if (!chat) {
    chat = await Chat.create();
    await activity.setChat(chat);
  }
  return chat;
};

const getActivityWithAccess = async (activityId, user) => {
  const activity = await Activity.findByPk(activityId, {
    include: membershipInclude,
  });
  if (!activity) {
    return { error: { status: 404, message: "Activity not found" } };
  }

  const isHostUser = activity.hostUserId === user.id;
  const isHostOrganisation =
    activity.hostOrganisation &&
    activity.hostOrganisation.ownerId === user.id;
  const isParticipant = activity.users.some((u) => u.id === user.id);

  if (!isParticipant && !isHostUser && !isHostOrganisation && user.role !== "admin") {
    return { error: { status: 403, message: "Forbidden" } };
  }

  const chat = await ensureChatForActivity(activity);
  return { activity, chat };
};

module.exports = {
  membershipInclude,
  messageInclude,
  formatUserName,
  serializeMessage,
  ensureChatForActivity,
  getActivityWithAccess,
};
