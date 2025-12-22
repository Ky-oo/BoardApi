const express = require("express");
const { Op } = require("sequelize");
const {
  Activity,
  User,
  Organisation,
  Chat,
  ChatMessage,
  Payment,
} = require("../model");
const { verifyAuth } = require("../middleware/auth");
const {
  messageInclude,
  serializeMessage,
  buildSystemContent,
  formatUserName,
} = require("../utils/chatHelpers");
const { emitToRoom } = require("../ws/chatServer");

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? require("stripe")(stripeSecretKey) : null;

const router = express.Router();

const REFUND_WINDOW_MS = 2 * 60 * 60 * 1000;

const isRefundWindowOpen = (activity) => {
  if (!activity?.date) return false;
  const eventDate = new Date(activity.date);
  if (Number.isNaN(eventDate.getTime())) return false;
  return Date.now() <= eventDate.getTime() - REFUND_WINDOW_MS;
};

const ensureStripeConfigured = (res) => {
  if (stripe) return true;
  res.status(500).json({ error: "Stripe is not configured." });
  return false;
};

const getPaginationParams = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = 13;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const buildDateRangeFilter = (dateInput) => {
  if (typeof dateInput !== "string" || !dateInput) return null;
  const parts = dateInput.split("-").map((part) => parseInt(part, 10));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  const [year, month, day] = parts;
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  return { [Op.gte]: start, [Op.lt]: end };
};

const getHostFilters = (query) => {
  const where = {};
  const hostOrganisationId = parseInt(query.hostOrganisationId, 10);
  const hostUserId = parseInt(query.hostUserId, 10);
  const city = typeof query.city === "string" ? query.city.trim() : "";
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const dateFilter = buildDateRangeFilter(query.date);

  if (Number.isInteger(hostOrganisationId)) {
    where.hostOrganisationId = hostOrganisationId;
  }

  if (Number.isInteger(hostUserId)) {
    where.hostUserId = hostUserId;
  }

  if (city && city !== "0") {
    where.city = { [Op.like]: `%${city}%` };
  }

  if (dateFilter) {
    where.date = dateFilter;
  }

  if (search) {
    const likePattern = `%${search}%`;
    where[Op.or] = [
      { title: { [Op.like]: likePattern } },
      { description: { [Op.like]: likePattern } },
      { place_name: { [Op.like]: likePattern } },
      { address: { [Op.like]: likePattern } },
      { city: { [Op.like]: likePattern } },
    ];
  }

  return where;
};

const ensureActivityChat = async (activity) => {
  let chat = await activity.getChat();
  if (!chat) {
    chat = await Chat.create();
    await activity.setChat(chat);
  }
  return chat;
};

const validateHost = async (body, user) => {
  if (user.role === "admin") {
    return null;
  }
  const hasUser = !!body.hostUserId;
  const hasOrganisation = !!body.hostOrganisationId;

  if (!hasUser && !hasOrganisation) {
    return "Activity requires hostUserId or hostOrganisationId";
  }
  if (hasUser && hasOrganisation) {
    return "Provide only one of hostUserId or hostOrganisationId";
  }

  if (hasUser && body.hostUserId !== user.id) {
    return "You can only create activities for yourself or your organisations";
  }

  if (hasOrganisation) {
    const organisation = await Organisation.findByPk(body.hostOrganisationId);
    if (!organisation) {
      return "Organisation not found";
    }
    if (organisation.ownerId !== user.id) {
      return "You can only create activities for yourself or your organisations";
    }
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
    through: { attributes: [] },
  },
];

router.get("/", async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const where = getHostFilters(req.query);

    const { rows, count } = await Activity.findAndCountAll({
      include: defaultInclude,
      where,
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
    const validationError = await validateHost(req.body, req.user);

    if (validationError)
      return res.status(400).json({ error: validationError });
    const activity = await Activity.create(req.body);
    const chat = await ensureActivityChat(activity);
    const isOrganisationHost = !!req.body.hostOrganisationId;
    if (!isOrganisationHost) {
      await activity.addUser(req.user.id);
      await chat.addMember(req.user.id);
    }

    const created = await Activity.findByPk(activity.id, {
      include: defaultInclude,
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", verifyAuth, async (req, res) => {
  try {
    const activity = await Activity.findByPk(req.params.id);
    if (!activity) return res.status(404).json({ error: "Activity not found" });

    let isHostOrganisation = false;
    if (activity.hostOrganisationId) {
      const organisation = await Organisation.findByPk(
        activity.hostOrganisationId
      );
      isHostOrganisation = organisation && organisation.ownerId === req.user.id;
    }

    const isHostUser = activity.hostUserId === req.user.id;
    if (!isHostUser && !isHostOrganisation && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const validationError = await validateHost(
      {
        hostUserId:
          req.body.hostUserId !== undefined
            ? req.body.hostUserId
            : activity.hostUserId,
        hostOrganisationId:
          req.body.hostOrganisationId !== undefined
            ? req.body.hostOrganisationId
            : activity.hostOrganisationId,
      },
      req.user
    );
    if (validationError)
      return res.status(400).json({ error: validationError });

    await activity.update(req.body);
    const updated = await Activity.findByPk(activity.id, {
      include: defaultInclude,
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/join", verifyAuth, async (req, res) => {
  try {
    const activity = await Activity.findByPk(req.params.id, {
      include: defaultInclude,
    });

    if (!activity) return res.status(404).json({ error: "Activity not found" });

    const priceNumber = Number(activity.price || 0);
    if (priceNumber > 0) {
      return res.status(400).json({ error: "Payment required" });
    }

    const alreadyJoined = activity.users.some(
      (user) => user.id === req.user.id
    );
    if (alreadyJoined) {
      return res.json(activity);
    }

    if (
      Number.isInteger(activity.seats) &&
      activity.seats > 0 &&
      activity.users.length >= activity.seats
    ) {
      return res.status(400).json({ error: "Activity is full" });
    }

    await activity.addUser(req.user.id);
    const chat = await ensureActivityChat(activity);
    await chat.addMember(req.user.id);
    try {
      const fullUser = await User.findByPk(req.user.id);
      const displayName = formatUserName(fullUser) || "Un participant";
      const systemContent = buildSystemContent(
        `${displayName} a rejoint l'événement`
      );
      const systemMessage = await ChatMessage.create({
        chatId: chat.id,
        userId: req.user.id,
        content: systemContent,
      });
      const saved = await ChatMessage.findByPk(systemMessage.id, {
        include: messageInclude,
      });
      if (saved) {
        emitToRoom(activity.id, {
          type: "message",
          message: serializeMessage(saved),
        });
      }
    } catch (err) {
      console.error("System join message error:", err);
    }
    const updated = await Activity.findByPk(req.params.id, {
      include: defaultInclude,
    });
    return res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id/leave", verifyAuth, async (req, res) => {
  try {
    const activity = await Activity.findByPk(req.params.id, {
      include: defaultInclude,
    });
    if (!activity) return res.status(404).json({ error: "Activity not found" });

    if (activity.hostUserId === req.user.id) {
      return res.status(403).json({ error: "Host cannot leave activity" });
    }
    if (activity.hostOrganisation?.ownerId === req.user.id) {
      return res.status(403).json({ error: "Host cannot leave activity" });
    }

    const isMember = activity.users.some((user) => user.id === req.user.id);
    if (isMember) {
      const priceNumber = Number(activity.price || 0);
      const isPaidActivity = Number.isFinite(priceNumber) && priceNumber > 0;
      const shouldRefund = isPaidActivity && isRefundWindowOpen(activity);

      if (shouldRefund) {
        if (!ensureStripeConfigured(res)) return;
        const payment = await Payment.findOne({
          where: {
            userId: req.user.id,
            activityId: activity.id,
            status: "paid",
          },
          order: [["createdAt", "DESC"]],
        });
        if (!payment) {
          return res.status(400).json({ error: "Payment not found for refund" });
        }
        if (!payment.paymentIntentId) {
          return res
            .status(400)
            .json({ error: "Payment intent missing for refund" });
        }
        try {
          const refund = await stripe.refunds.create({
            payment_intent: payment.paymentIntentId,
          });
          await payment.update({
            status: "refunded",
            refundId: refund.id,
            refundedAt: new Date(),
          });
        } catch (err) {
          return res
            .status(400)
            .json({ error: err.message || "Refund failed" });
        }
      }

      await activity.removeUser(req.user.id);
      const chat = await activity.getChat();
      if (chat) {
        await chat.removeMember(req.user.id);
      }
    }
    const updated = await Activity.findByPk(req.params.id, {
      include: defaultInclude,
    });
    return res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", verifyAuth, async (req, res) => {
  try {
    const activity = await Activity.findByPk(req.params.id);
    if (!activity) return res.status(404).json({ error: "Activity not found" });

    let isHostOrganisation = false;
    if (activity.hostOrganisationId) {
      const organisation = await Organisation.findByPk(
        activity.hostOrganisationId
      );
      isHostOrganisation = organisation && organisation.ownerId === req.user.id;
    }

    const isHostUser = activity.hostUserId === req.user.id;
    if (!isHostUser && !isHostOrganisation && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    await activity.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
