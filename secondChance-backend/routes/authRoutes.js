const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();
const connectToDatabase = require("../models/db");
const logger = require("../logger");

const JWT_SECRET = process.env.JWT_SECRET;

router.post("/register", async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("users");

    const existingEmail = await collection.findOne({ email: req.body.email });

    if (existingEmail) {
      logger.error("Email id already exists");
      return res.status(400).json({ error: "Email id already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    const user = {
      email: req.body.email,
      password: hashedPassword,
    };

    const newUser = await collection.insertOne(user);

    const payload = {
      user: {
        id: newUser.insertedId,
      },
    };
    const authToken = jwt.sign(payload, JWT_SECRET);

    logger.info("User created successfully");

    res.status(201).json({ authToken, email: req.body.email });
  } catch (e) {
    next(e);
  }
});

router.post("/login", async (req, res) => {
  try {
    // Task 1: Connect to `secondChance` in MongoDB through `connectToDatabase` in `db.js`.
    const db = await connectToDatabase();
    const collection = db.collection("users");

    const user = await collection.findOne({ email: req.body.email });

    if (!user) {
      logger.error("User not found");
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);

    if (!isMatch) {
      logger.error("Invalid password");
      return res.status(400).json({ error: "Invalid password" });
    }

    const payload = {
      user: {
        id: user._id,
      },
    };
    const authToken = jwt.sign(payload, JWT_SECRET);

    logger.info("User logged in successfully");

    res.json({ authToken, userName: user.name, userEmail: user.email });
  } catch (e) {
    return res.status(500).send("Internal server error");
  }
});

module.exports = router;
