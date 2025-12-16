const express = require("express");
const { Chat, ChatMessage, User } = require("../model");
const { requireRole } = require("../middleware/auth");
const router = express.Router();

const getPaginationParams = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const defaultInclude = [
  {
    model: User,
    as: "User",
    attributes: ["id", "firstname", "lastname", "pseudo", "email"],
  },
];

router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { rows, count } = await Chat.findAndCountAll({
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const chat = await Chat.findByPk(req.params.id);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (req.user.id !== chat.chatUserId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/messages", async (req, res) => {
  try {
    const chat = await Chat.findByPk(req.params.id);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (req.user.id !== chat.chatUserId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { page, limit, offset } = getPaginationParams(req.query);
    const { rows, count } = await ChatMessage.findAndCountAll({
      include: defaultInclude,
      where: { chatId: req.params.id },
      order: [["createdAt", "ASC"]],
      limit,
      offset,
    });

    res.status(200).json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
