const express = require("express");
const { Organisation } = require("../model");
const { requireRole, verifyAuth } = require("../middleware/auth");
const router = express.Router();

router.get("/", verifyAuth, requireRole("admin"), async (req, res) => {
  try {
    const organisations = await Organisation.findAll();
    res.json(organisations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/mine", verifyAuth, async (req, res) => {
  try {
    const organisations = await Organisation.findAll({
      where: { ownerId: req.user.id },
    });
    res.json(organisations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", verifyAuth, async (req, res) => {
  try {
    const organisation = await Organisation.findByPk(req.params.id);
    if (!organisation) {
      return res.status(404).json({ error: "Organisation not found" });
    }
    res.json(organisation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", verifyAuth, async (req, res) => {
  try {
    const ownerId =
      req.user.role === "admin" && req.body.ownerId
        ? req.body.ownerId
        : req.user.id;
    const organisation = await Organisation.create({
      ...req.body,
      ownerId,
    });
    res.status(201).json(organisation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", verifyAuth, async (req, res) => {
  try {
    const organisation = await Organisation.findByPk(req.params.id);
    if (!organisation) {
      return res.status(404).json({ error: "Organisation not found" });
    }
    if (req.user.id !== organisation.ownerId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    await organisation.update(req.body);
    res.json(organisation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", verifyAuth, async (req, res) => {
  try {
    const organisation = await Organisation.findByPk(req.params.id);
    if (!organisation) {
      return res.status(404).json({ error: "Organisation not found" });
    }
    if (req.user.id !== organisation.ownerId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    await organisation.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
