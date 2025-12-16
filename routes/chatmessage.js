const express = require("express");
const { ChatMessage } = require("../model");
const { requireRole } = require("../middleware/auth");
const router = express.Router();

router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const messages = await ChatMessage.findAll();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const message = await ChatMessage.findByPk(req.params.id);

    if (!message)
      return res.status(404).json({ error: "ChatMessage not found" });
    if (message.chatUserId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    if (!req.body.chatId || !req.body.userId) {
      return res.status(400).json({ error: "chatId and userId are required" });
    }
    if (req.body.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const message = await ChatMessage.create(req.body);
    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const message = await ChatMessage.findByPk(req.params.id);
    if (!message)
      return res.status(404).json({ error: "ChatMessage not found" });
    if (message.chatUserId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    await message.update(req.body);
    res.json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const message = await ChatMessage.findByPk(req.params.id);
    if (!message)
      return res.status(404).json({ error: "ChatMessage not found" });
    if (message.chatUserId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    await message.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
