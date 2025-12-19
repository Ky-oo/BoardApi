const express = require("express");
const { Op } = require("sequelize");
const { Chat, ChatMessage } = require("../model");
const { verifyAuth, requireRole } = require("../middleware/auth");
const {
  getActivityWithAccess,
  messageInclude,
  serializeMessage,
} = require("../utils/chatHelpers");

const router = express.Router();

router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const chats = await Chat.findAll({ order: [["createdAt", "DESC"]] });
    res.json({ data: chats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:activityId", verifyAuth, async (req, res) => {
  try {
    const { activity, chat, error } = await getActivityWithAccess(
      req.params.activityId,
      req.user
    );
    if (error) return res.status(error.status).json({ error: error.message });
    res.json({ chatId: chat.id, activityId: activity.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:activityId/messages", verifyAuth, async (req, res) => {
  try {
    const { activityId } = req.params;
    const { before } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

    const { chat, error } = await getActivityWithAccess(activityId, req.user);
    if (error) return res.status(error.status).json({ error: error.message });

    const where = { chatId: chat.id };
    if (before) {
      const beforeId = parseInt(before, 10);
      if (!Number.isNaN(beforeId)) {
        where.id = { [Op.lt]: beforeId };
      }
    }

    const messages = await ChatMessage.findAll({
      where: { ...where, isDeleted: false },
      include: messageInclude,
      order: [["createdAt", "ASC"]],
      limit,
    });

    res.json({
      data: messages.map(serializeMessage),
      pagination: {
        limit,
        before: before || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
