const express = require("express");
const { Chat, ChatMessage } = require("../model");
const { requireRole } = require("../middleware/auth");
const router = express.Router();

const getPaginationParams = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

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
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/messages", async (req, res) => {
  try {
    const chat = await Chat.findByPk(req.params.id);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const { page, limit, offset } = getPaginationParams(req.query);
    const { rows, count } = await ChatMessage.findAndCountAll({
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

router.post("/", async (req, res) => {
  try {
    if (!req.body.activityId) {
      return res.status(400).json({ error: "activityId is required" });
    }
    const chat = await Chat.create(req.body);
    res.status(201).json(chat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const chat = await Chat.findByPk(req.params.id);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    await chat.update(req.body);
    res.json(chat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const chat = await Chat.findByPk(req.params.id);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    await chat.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
