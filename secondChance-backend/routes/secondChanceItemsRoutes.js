const express = require("express");
const multer = require("multer");

const router = express.Router();
const connectToDatabase = require("../models/db");
const logger = require("../logger");

// Define the upload directory path
const directoryPath = "public/images";

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath); // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  }
});

const upload = multer({ storage: storage });

// Get all secondChanceItems
router.get("/", async (req, res, next) => {
  logger.info("/ called");
  try {
    const db = await connectToDatabase();
    const collection = db.collection("secondChanceItems");
    const secondChanceItems = await collection.find({}).toArray();
    res.json(secondChanceItems);
  } catch (e) {
    logger.console.error("oops something went wrong", e);
    next(e);
  }
});

// Add a new item
router.post("/", upload.single("image"), async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("secondChanceItems");

    // Get the last item's id, default to 0
    const lastItem = await collection
      .find({})
      .sort({ id: -1 })
      .limit(1)
      .toArray();

    const lastId = lastItem.length > 0 ? parseInt(lastItem[0].id) : 0;

    const item = req.body;
    item.id = (lastId + 1).toString();

    const dateAdded = Math.floor(new Date().getTime() / 1000);
    item.date_added = dateAdded;

    const secondChanceItem = await collection.insertOne(item);

    res.status(201).json(secondChanceItem);
  } catch (e) {
    next(e);
  }
});

// Get a single secondChanceItem by ID
router.get("/:id", async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("secondChanceItems");

    const item = await collection.findOne({ id: req.params.id });

    res.json(item);
  } catch (e) {
    next(e);
  }
});

// Update and existing item
router.put("/:id", async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("secondChanceItems");
    const item = await collection.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { returnDocument: "after" }
    );
    if (item) {
      res.json({ uploaded: "success" });
    } else {
      res.json({ uploaded: "failed" });
    }
  } catch (e) {
    next(e);
  }
});

// Delete an existing item
router.delete("/:id", async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("secondChanceItems");
    await collection.deleteOne({ id: req.params.id });
    res.json({ deleted: "success" });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
