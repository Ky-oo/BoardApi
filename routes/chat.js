const express = require("express");
const { Chat } = require("../model");
const { requireRole } = require("../middleware/auth");
const router = express.Router();

router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const chats = await Chat.findAll();
    res.json(chats);
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
    const chat = await Chat.findByPk(req.params.id, {
      include: ["messages"],
    });
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    res.status(200).json(chat.messages);
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
