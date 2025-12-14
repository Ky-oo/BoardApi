const express = require("express");
const { Organisation } = require("../model");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const organisations = await Organisation.findAll();
    res.json(organisations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
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

router.post("/", async (req, res) => {
  try {
    const organisation = await Organisation.create(req.body);
    res.status(201).json(organisation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const organisation = await Organisation.findByPk(req.params.id);
    if (!organisation) {
      return res.status(404).json({ error: "Organisation not found" });
    }
    await organisation.update(req.body);
    res.json(organisation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const organisation = await Organisation.findByPk(req.params.id);
    if (!organisation) {
      return res.status(404).json({ error: "Organisation not found" });
    }
    await organisation.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
