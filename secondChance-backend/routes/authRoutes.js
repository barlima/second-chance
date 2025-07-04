const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult, body } = require("express-validator");

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
      ...req.body,
    };

    const newUser = await collection.insertOne(user);

    const payload = {
      user: {
        id: newUser.insertedId,
      },
    };
    const authtoken = jwt.sign(payload, JWT_SECRET);

    logger.info("User created successfully");

    res.status(201).json({ authtoken, email: req.body.email });
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
    const authtoken = jwt.sign(payload, JWT_SECRET);

    logger.info("User logged in successfully");

    res.json({ authtoken, userName: user.name, userEmail: user.email });
  } catch (e) {
    return res.status(500).send("Internal server error");
  }
});

router.put("/update", async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = await connectToDatabase();
    const collection = db.collection("users");

    const existingUser = await collection.findOne({ email: req.body.email });

    existingUser.name = req.body.name;
    existingUser.updatedAt = new Date();

    await collection.updateOne(
      { email: req.body.email },
      { $set: existingUser },
      { returnDocument: "after" }
    );

    const payload = {
      user: {
        id: existingUser._id,
      },
    };

    const authtoken = jwt.sign(payload, JWT_SECRET);

    res.json({ authtoken });
  } catch (e) {
    return res.status(500).send("Internal server error");
  }
});

module.exports = router;
