const express = require("express");
const { Activity, User, Organisation, Chat, ChatMessage } = require("../model");
const { verifyAuth } = require("../middleware/auth");

const router = express.Router();

const getPaginationParams = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = 12;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const validateHost = (body) => {
  const hasUser = !!body.hostUserId;
  const hasOrganisation = !!body.hostOrganisationId;
  if (!hasUser && !hasOrganisation) {
    return "Activity requires hostUserId or hostOrganisationId";
  }
  if (hasUser && hasOrganisation) {
    return "Provide only one of hostUserId or hostOrganisationId";
  }
  return null;
};

const defaultInclude = [
  {
    model: User,
    as: "hostUser",
    attributes: ["id", "firstname", "lastname", "pseudo", "email"],
  },
  { model: Organisation, as: "hostOrganisation" },
  {
    model: User,
    as: "users",
    attributes: ["id", "firstname", "lastname", "pseudo", "email"],
  },
];

router.get("/", async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);

    const { rows, count } = await Activity.findAndCountAll({
      include: defaultInclude,
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
    const activity = await Activity.findByPk(req.params.id, {
      include: defaultInclude,
    });
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", verifyAuth, async (req, res) => {
  try {
    const validationError = validateHost(req.body);
    if (validationError)
      return res.status(400).json({ error: validationError });
    const activity = await Activity.create(req.body);
    res.status(201).json(activity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", verifyAuth, async (req, res) => {
  try {
    const validationError = validateHost(req.body);
    if (validationError)
      return res.status(400).json({ error: validationError });

    const activity = await Activity.findByPk(req.params.id);
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    await activity.update(req.body);
    res.json(activity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", verifyAuth, async (req, res) => {
  try {
    const activity = await Activity.findByPk(req.params.id);
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    await activity.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
