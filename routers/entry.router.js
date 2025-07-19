const express = require("express");
const router = express.Router();
const EntryService = require("../services/entry.service");
const multer = require("multer");
const { normalizeNewlines } = require("../services/utilities/lib");
// const upload = multer({ dest: "uploads/" });
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

router.get("/", async (req, res, next) => {
  try {
    let list = await EntryService.getAllEntries();
    res.status(200).json(list);
  } catch (error) {
    next(error); // Send error to middleware
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    // Typo: should be getEntryById, not getAllEntryById
    let obj = await EntryService.getEntryById(id);
    if (!obj) {
      return res.status(404).json({ message: "Entry not found" });
    }
    res.send(obj); // Send the object if found

  } catch (error) {
    next(error); // Send error to middleware
  }
});

router.post("/", upload.any(), async (req, res, next) => {
  try {
    let obj = req.body;
    // normalize text
    const keys = Object.keys(obj);
    for (let key of keys) {
      if (typeof obj[key] == "string") {
        obj[key] = normalizeNewlines(obj[key]);
      }
    }
    obj.addDate = new Date();
    obj.updateDate = new Date();
    obj = await EntryService.addEntry(obj);
    res.status(201).json(obj);
  } catch (error) {
    next(error); // Send error to middleware
  }
});

router.post("/bulk-add", async (req, res, next) => {
  let entries = req.body;
  console.log("Received entries for bulk-add ", entries);

  if (!Array.isArray(entries)) {
    return res.status(400).json({ message: "Invalid input, expected array" });
  }

  try {
    const Entry = require("../models/entry.model"); // Adjust path if needed
    const result = [];

    for (const entry of entries) {
      const { userId, date } = entry;
      const keys = Object.keys(entry);
      for (let key of keys) {
        if (typeof entry[key] === "string") {
          entry[key] = normalizeNewlines(entry[key]);
        }
      }

      // Normalize and add timestamps
      entry.addDate = new Date();
      entry.updateDate = new Date();

      // Ensure date is in a comparable format, assuming 'YYYY-MM-DD' from frontend
      const entryDate = new Date(date).toISOString().split('T')[0];

      const existing = await Entry.findOne({ userId, date: { $regex: `^${entryDate}` } }); // Match date string start

      if (existing) {
        // Update the existing entry
        existing.delivered_qty = entry.delivered_qty;
        existing.entry_status = entry.entry_status;
        existing.updateDate = new Date();
        await existing.save();
        result.push(existing);
      } else {
        // Create a new entry
        const newEntry = new Entry(entry);
        await newEntry.save();
        result.push(newEntry);
      }
    }

    res.status(201).json(result);
  } catch (error) {
    console.error("Bulk-add error:", error);
    next(error);
  }
});

// --- START OF REQUIRED CHANGES FOR Single Entry PUT route ---
// This new route will handle updates for a specific entry by its ID in the URL
router.put("/:id", upload.any(), async (req, res, next) => { // Route now accepts an ID parameter
  try {
    const entryId = req.params.id; // Get the entry's actual _id from the URL
    const fieldsToUpdate = req.body; // The request body contains the fields to update

    // It's good practice to ensure updateDate is set on the server
    fieldsToUpdate.updateDate = new Date();

    // Call the updated service method with the ID and the fields to update
    let updatedEntry = await EntryService.updateEntry(entryId, fieldsToUpdate);

    if (!updatedEntry) {
      return res.status(404).json({ message: "Entry not found for update." });
    }

    res.status(200).json(updatedEntry); // Send back the actual updated document
  } catch (error) {
    console.error("Error updating single entry:", error); // Specific error log
    next(error); // Send error to middleware
  }
});
// --- END OF REQUIRED CHANGES FOR Single Entry PUT route ---


router.put("/bulk-update", async (req, res, next) => {
  let entries = req.body;
  if (!Array.isArray(entries)) {
    return res.status(400).json({ message: "Invalid input, expected array" });
  }
  entries.forEach((e, index) => {
    e.updateDate = new Date();
  });
  try {
    let result = await EntryService.updateManyEntries(entries);
    res.status(201).json(result);
  } catch (error) {
    next(error); // Send error to middleware
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    // obj = req.body; // obj is not used here, can be removed if not needed elsewhere
    let obj = await EntryService.deleteEntry(id);
    res.json(obj);
  } catch (error) {
    next(error); // Send error to middleware
  }
});

module.exports = router;



