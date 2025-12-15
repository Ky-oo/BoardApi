const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../model");

const router = express.Router();

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

router.post("/register", async (req, res) => {
  const { firstname, lastname, pseudo, email, password, city, role } = req.body;
  if (!firstname || !lastname || !pseudo || !email || !password || !city) {
    return res.status(400).json({
      error: "firstname, lastname, pseudo, email, password, city are required",
    });
  }

  try {
    const user = await User.create({
      firstname,
      lastname,
      pseudo,
      email,
      password,
      city,
      role: role || "user",
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

module.exports = router;
