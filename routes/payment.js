const express = require("express");
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

const getClientBaseUrl = () => {
  const direct =
    process.env.APP_BASE_URL ||
    process.env.CLIENT_BASE_URL ||
    process.env.FRONTEND_URL;
  if (direct) return direct.replace(/\/+$/, "");

  const origins = process.env.CORS_ORIGINS || "";
  const first = origins
    .split(",")
    .map((value) => value.trim())
    .find(Boolean);
  return (first || "http://localhost:5173").replace(/\/+$/, "");
};

const ensureStripeConfigured = (res) => {
  if (stripe) return true;
  res.status(500).json({ error: "Stripe is not configured." });
  return false;
};

const ensureActivityChat = async (activity) => {
  let chat = await activity.getChat();
  if (!chat) {
    chat = await Chat.create();
    await activity.setChat(chat);
  }
  return chat;
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

const getActivityPrice = (activity) => {
  const raw = activity?.price ?? 0;
  const priceNumber = Number(raw);
  return Number.isFinite(priceNumber) ? priceNumber : 0;
};

router.post("/checkout", verifyAuth, async (req, res) => {
  if (!ensureStripeConfigured(res)) return;
  const activityId = Number(req.body.activityId);
  if (!activityId) {
    return res.status(400).json({ error: "activityId is required" });
  }

  try {
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    const priceNumber = getActivityPrice(activity);
    if (!priceNumber || priceNumber <= 0) {
      return res.status(400).json({ error: "Activity is free" });
    }

    const alreadyJoined = await activity.hasUser(req.user.id);
    if (alreadyJoined) {
      return res.status(400).json({ error: "Already joined" });
    }

    const paidPayment = await Payment.findOne({
      where: { userId: req.user.id, activityId: activity.id, status: "paid" },
    });
    if (paidPayment) {
      return res.status(400).json({ error: "Payment already completed" });
    }

    const seats = Number(activity.seats || 0);
    const participantCount = await activity.countUsers();
    if (seats > 0 && participantCount >= seats) {
      return res.status(400).json({ error: "Activity is full" });
    }

    const baseUrl = getClientBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: activity.title,
              description: activity.description?.slice(0, 200) || undefined,
            },
            unit_amount: Math.round(priceNumber * 100),
          },
          quantity: 1,
        },
      ],
      client_reference_id: String(req.user.id),
      metadata: {
        activityId: String(activity.id),
        userId: String(req.user.id),
      },
      success_url: `${baseUrl}/activity/${activity.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/activity/${activity.id}?payment=cancel`,
    });

    try {
      await Payment.create({
        userId: req.user.id,
        activityId: activity.id,
        sessionId: session.id,
        amount: priceNumber,
        currency: "eur",
        status: "pending",
      });
    } catch (err) {
      console.error("Payment record error:", err);
      return res
        .status(500)
        .json({ error: "Unable to create payment record" });
    }

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(400).json({ error: err.message || "Stripe error" });
  }
});

router.post("/confirm", verifyAuth, async (req, res) => {
  if (!ensureStripeConfigured(res)) return;
  const sessionId = req.body.sessionId;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    const metadata = session.metadata || {};
    const activityId = Number(metadata.activityId);
    const userId = Number(metadata.userId);
    if (!activityId || !userId) {
      return res.status(400).json({ error: "Invalid session metadata" });
    }
    if (userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || null;
    const sessionCurrency =
      typeof session.currency === "string" ? session.currency : "eur";
    const amountTotal =
      typeof session.amount_total === "number" ? session.amount_total : null;
    const amountValue =
      amountTotal !== null ? amountTotal / 100 : getActivityPrice(activity);
    const normalizedAmount = Number.isFinite(amountValue)
      ? amountValue
      : getActivityPrice(activity);

    let paymentRecord = await Payment.findOne({ where: { sessionId } });
    if (
      paymentRecord &&
      (paymentRecord.userId !== userId || paymentRecord.activityId !== activityId)
    ) {
      return res.status(400).json({ error: "Invalid payment record" });
    }
    if (paymentRecord?.status === "refunded") {
      return res.status(400).json({ error: "Payment already refunded" });
    }

    if (!paymentRecord) {
      paymentRecord = await Payment.create({
        userId,
        activityId,
        sessionId,
        amount: normalizedAmount,
        currency: sessionCurrency,
        status: "paid",
        paymentIntentId: paymentIntentId || null,
        paidAt: new Date(),
      });
    } else {
      const updates = {
        status: "paid",
        paidAt: paymentRecord.paidAt || new Date(),
        amount: normalizedAmount,
        currency: sessionCurrency,
      };
      if (paymentIntentId) {
        updates.paymentIntentId = paymentIntentId;
      }
      await paymentRecord.update(updates);
    }

    const alreadyJoined = await activity.hasUser(req.user.id);
    if (!alreadyJoined) {
      const seats = Number(activity.seats || 0);
      const participantCount = await activity.countUsers();
      if (seats > 0 && participantCount >= seats) {
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
    }

    const updated = await Activity.findByPk(activityId, {
      include: defaultInclude,
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || "Stripe error" });
  }
});

module.exports = router;
