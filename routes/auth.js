const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { User } = require("../model");

const router = express.Router();
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

const sanitizeUser = (user) => {
  const data = user.toJSON();
  delete data.password;
  return data;
};

const signToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
};

const verifyGoogleToken = async (idToken) => {
  if (!googleClient || !googleClientId) {
    throw new Error("Google client ID not configured");
  }
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error("Invalid Google token");
  }
  return payload;
};

const buildNameParts = (payload, overrides) => {
  const firstFromPayload =
    payload.given_name || (payload.name || "").split(" ")[0] || "";
  const lastFromPayload =
    payload.family_name ||
    (payload.name || "")
      .split(" ")
      .slice(1)
      .join(" ") ||
    "";

  return {
    firstname: (overrides.firstname || firstFromPayload).trim(),
    lastname: (overrides.lastname || lastFromPayload).trim(),
  };
};

router.post("/register", async (req, res) => {
  const { firstname, lastname, pseudo, email, password, city } = req.body;
  if (!firstname || !lastname || !pseudo || !email || !password || !city) {
    return res.status(400).json({
      error: "firstname, lastname, pseudo, email, password, city are required",
    });
  }

  try {
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ error: "Email already in use" });
    }
    const existingPseudo = await User.findOne({ where: { pseudo } });
    if (existingPseudo) {
      return res.status(409).json({ error: "Pseudo already in use" });
    }
    const user = await User.create({
      firstname,
      lastname,
      pseudo,
      email,
      password,
      city,
      role: "user",
    });
    const token = signToken(user);
    res.status(201).json({ user: sanitizeUser(user), token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Provide email and password" });
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken(user);
    res.json({ user: sanitizeUser(user), token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/google", async (req, res) => {
  const idToken = req.body?.credential || req.body?.idToken;
  if (!idToken) {
    return res.status(400).json({ error: "Google credential required" });
  }

  try {
    const payload = await verifyGoogleToken(idToken);
    const user = await User.findOne({ where: { email: payload.email } });

    if (user) {
      const token = signToken(user);
      return res.json({ user: sanitizeUser(user), token });
    }

    const { firstname, lastname } = buildNameParts(payload, {});
    return res.json({
      needsCompletion: true,
      profile: {
        firstname: firstname || undefined,
        lastname: lastname || undefined,
        email: payload.email,
        picture: payload.picture,
      },
    });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

router.post("/google/complete", async (req, res) => {
  const idToken = req.body?.credential || req.body?.idToken;
  const { pseudo, city, firstname, lastname } = req.body || {};

  if (!idToken) {
    return res.status(400).json({ error: "Google credential required" });
  }
  if (!pseudo || !city) {
    return res.status(400).json({
      error: "pseudo and city are required",
    });
  }

  try {
    const payload = await verifyGoogleToken(idToken);
    const existing = await User.findOne({ where: { email: payload.email } });
    if (existing) {
      const token = signToken(existing);
      return res.json({ user: sanitizeUser(existing), token });
    }
    const existingPseudo = await User.findOne({ where: { pseudo } });
    if (existingPseudo) {
      return res.status(409).json({ error: "Pseudo already in use" });
    }

    const names = buildNameParts(payload, {
      firstname: firstname || "",
      lastname: lastname || "",
    });

    if (!names.firstname || !names.lastname) {
      return res.status(400).json({
        error: "firstname and lastname are required",
      });
    }

    const randomPassword = crypto.randomBytes(24).toString("hex");
    const user = await User.create({
      firstname: names.firstname,
      lastname: names.lastname,
      pseudo: pseudo.trim(),
      email: payload.email,
      password: randomPassword,
      city: city.trim(),
      role: "user",
    });

    const token = signToken(user);
    return res.status(201).json({ user: sanitizeUser(user), token });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
