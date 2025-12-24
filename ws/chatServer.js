const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { ChatMessage, ChatMessageSeen, User } = require("../model");
const {
  getActivityWithAccess,
  messageInclude,
  serializeMessage,
} = require("../utils/chatHelpers");

const HISTORY_LIMIT = 50;
const MAX_CONTENT_LENGTH = 1000;
const DELETE_EVENT = "deleted";

const rooms = new Map();

const send = (ws, payload) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
};

const sendError = (ws, message) => send(ws, { type: "error", message });

const broadcast = (activityId, payload, excludeWs) => {
  const clients = rooms.get(activityId);
  if (!clients) return;
  clients.forEach((client) => {
    if (client === excludeWs) return;
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
};

const emitToRoom = (activityId, payload) => {
  broadcast(activityId, payload);
};

const authenticate = async (token) => {
  if (!token) return { error: "Authentication required" };
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.id);
    if (!user) return { error: "User not found" };
    return { user };
  } catch (err) {
    return { error: "Invalid or expired token" };
  }
};

const cleanupConnection = (ws) => {
  if (!ws.activityId) return;
  const clients = rooms.get(ws.activityId);
  if (!clients) return;
  clients.delete(ws);
  if (clients.size === 0) {
    rooms.delete(ws.activityId);
  }
};

const loadHistory = async (ws, chatId) => {
  const messages = await ChatMessage.findAll({
    where: { chatId, isDeleted: false },
    include: messageInclude,
    order: [["createdAt", "ASC"]],
    limit: HISTORY_LIMIT,
  });
  send(ws, { type: "history", messages: messages.map(serializeMessage) });
};

const handleJoin = async (ws, payload) => {
  const activityId = Number(payload.activityId);
  if (!activityId) {
    sendError(ws, "Invalid activityId");
    return;
  }

  const { user, error: authError } = await authenticate(payload.token);
  if (authError) {
    sendError(ws, authError);
    ws.close();
    return;
  }

  const { chat, error: accessError } = await getActivityWithAccess(
    activityId,
    user
  );
  if (accessError) {
    sendError(ws, accessError.message);
    ws.close();
    return;
  }

  if (ws.activityId && ws.activityId !== activityId) {
    cleanupConnection(ws);
  }

  ws.user = user;
  ws.activityId = activityId;
  ws.chatId = chat.id;

  if (!rooms.has(activityId)) {
    rooms.set(activityId, new Set());
  }
  rooms.get(activityId).add(ws);

  await loadHistory(ws, chat.id);
};

const handleMessageEvent = async (ws, payload) => {
  if (!ws.user || !ws.chatId) {
    sendError(ws, "Join a room first");
    return;
  }

  const content = (payload.content || "").trim();
  if (!content) {
    sendError(ws, "Message content required");
    return;
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    sendError(ws, "Message too long");
    return;
  }

  const message = await ChatMessage.create({
    chatId: ws.chatId,
    userId: ws.user.id,
    content,
  });

  await ChatMessageSeen.findOrCreate({
    where: { messageId: message.id, userId: ws.user.id },
    defaults: { seenAt: new Date() },
  });

  const saved = await ChatMessage.findByPk(message.id, {
    include: messageInclude,
  });

  const payloadToSend = { type: "message", message: serializeMessage(saved) };
  broadcast(ws.activityId, payloadToSend);
};

const handleTypingEvent = (ws) => {
  if (!ws.user || !ws.chatId) {
    sendError(ws, "Join a room first");
    return;
  }
  broadcast(ws.activityId, { type: "typing", userId: ws.user.id }, ws);
};

const handleSeenEvent = async (ws, payload) => {
  if (!ws.user || !ws.chatId) {
    sendError(ws, "Join a room first");
    return;
  }

  const messageIds = Array.isArray(payload.messageIds)
    ? payload.messageIds
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id))
    : [];

  if (!messageIds.length) {
    sendError(ws, "messageIds array required");
    return;
  }

  const messages = await ChatMessage.findAll({
    where: {
      id: { [Op.in]: messageIds },
      chatId: ws.chatId,
      isDeleted: false,
    },
    attributes: ["id"],
  });

  const validIds = messages.map((m) => m.id);
  if (!validIds.length) return;

  await Promise.all(
    validIds.map((messageId) =>
      ChatMessageSeen.findOrCreate({
        where: { messageId, userId: ws.user.id },
        defaults: { seenAt: new Date() },
      })
    )
  );

  broadcast(ws.activityId, {
    type: "seen",
    userId: ws.user.id,
    messageIds: validIds,
  });
};

const handleDeleteEvent = async (ws, payload) => {
  if (!ws.user || !ws.chatId) {
    sendError(ws, "Join a room first");
    return;
  }
  const activityId = Number(payload.activityId);
  if (!activityId || activityId !== ws.activityId) {
    sendError(ws, "Invalid activityId");
    return;
  }

  const messageId = parseInt(payload.messageId, 10);
  if (Number.isNaN(messageId)) {
    sendError(ws, "Invalid messageId");
    return;
  }

  const message = await ChatMessage.findOne({
    where: { id: messageId, chatId: ws.chatId },
  });

  if (!message) {
    sendError(ws, "Message not found");
    return;
  }
  if (message.isDeleted) {
    send(ws, { type: "delete-ack", ok: true, messageId });
    return;
  }
  if (message.userId !== ws.user.id) {
    sendError(ws, "Forbidden");
    return;
  }

  await message.update({ isDeleted: true });

  const payloadToSend = { type: DELETE_EVENT, messageIds: [messageId] };
  broadcast(ws.activityId, payloadToSend);
  send(ws, { type: "delete-ack", ok: true, messageId });
};

const handlers = {
  join: handleJoin,
  message: handleMessageEvent,
  typing: handleTypingEvent,
  seen: handleSeenEvent,
  delete: handleDeleteEvent,
};

const setupChatWebSocketServer = (server) => {
  const wss = new WebSocket.Server({
    server,
    path: "/ws/chat",
  });

  wss.on("connection", (ws) => {
    ws.on("message", async (raw) => {
      let payload;
      try {
        payload = JSON.parse(raw.toString());
      } catch (err) {
        sendError(ws, "Invalid JSON");
        return;
      }

      if (!payload || !payload.type || !handlers[payload.type]) {
        sendError(ws, "Unknown event type");
        return;
      }

      try {
        await handlers[payload.type](ws, payload);
      } catch (err) {
        console.error("WebSocket handler error", err);
        sendError(ws, "Internal error");
      }
    });

    ws.on("close", () => cleanupConnection(ws));
  });
};

module.exports = {
  setupChatWebSocketServer,
  emitToRoom,
};
