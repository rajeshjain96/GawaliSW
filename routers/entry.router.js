const express = require("express");
const router = express.Router();
const EntryService = require("../services/entry.service");
const multer = require("multer");
const { normalizeNewlines } = require("../services/utilities/lib");
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
    next(error); 
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    let obj = await EntryService.getEntryById(id);
    if (!obj) {
      return res.status(404).json({ message: "Entry not found" });
    }
    res.send(obj); 
  } catch (error) {
    next(error); 
  }
});

router.post("/", upload.any(), async (req, res, next) => {
  try {
    let obj = req.body;
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
    next(error);  
  }
});

router.post("/bulk-add", async (req, res, next) => {
  let entries = req.body;
  console.log("Received entries for bulk-add ", entries);

  if (!Array.isArray(entries)) {
    return res.status(400).json({ message: "Invalid input, expected array" });
  }

  try {
    const Entry = require("../models/entry.model"); 
    const result = [];

    for (const entry of entries) {
      const { userId, date } = entry;
      const keys = Object.keys(entry);
      for (let key of keys) {
        if (typeof entry[key] === "string") {
          entry[key] = normalizeNewlines(entry[key]);
        }
      }

      entry.addDate = new Date();
      entry.updateDate = new Date();

      const entryDate = new Date(date).toISOString().split('T')[0];

      const existing = await Entry.findOne({ userId, date: { $regex: `^${entryDate}` } }); 

      if (existing) {
        existing.delivered_qty = entry.delivered_qty;
        existing.entry_status = entry.entry_status;
        existing.updateDate = new Date();
        await existing.save();
        result.push(existing);
      } else {
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

router.put("/:id", upload.any(), async (req, res, next) => { 
  try {
    const entryId = req.params.id; 
    const fieldsToUpdate = req.body; 
    fieldsToUpdate.updateDate = new Date();

    let updatedEntry = await EntryService.updateEntry(entryId, fieldsToUpdate);

    if (!updatedEntry) {
      return res.status(404).json({ message: "Entry not found for update." });
    }

    res.status(200).json(updatedEntry); 
  } catch (error) {
    console.error("Error updating single entry:", error); 
    next(error); 
  }
});


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
    next(error); 
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    let obj = await EntryService.deleteEntry(id);
    res.json(obj);
  } catch (error) {
    next(error); 
  }
});

module.exports = router;