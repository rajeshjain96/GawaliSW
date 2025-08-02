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

function validateMonthYear(req, res, next) {
  const { year, month } = req.params;
  const parsedYear = parseInt(year, 10);
  const parsedMonth = parseInt(month, 10);

  if (isNaN(parsedYear) || isNaN(parsedMonth) || parsedYear < 2000 || parsedMonth < 1 || parsedMonth > 12) {
    return res.status(400).json({ message: "Invalid year or month in URL. Year must be >= 2000, Month 1-12." });
  }
  req.targetYear = parsedYear;
  req.targetMonth = parsedMonth;
  next();
}

router.get("/:year/:month", validateMonthYear, async (req, res, next) => {
  try {
    const { targetYear, targetMonth } = req;
    let list = await EntryService.getAllEntries(targetYear, targetMonth);

    if (!list || list.length === 0) {
      return res.status(404).json({ message: `No entries found for ${targetMonth}/${targetYear}` });
    }
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
});

router.get("/:year/:month/:id", validateMonthYear, async (req, res, next) => {
  try {
    const { targetYear, targetMonth } = req;
    let id = req.params.id;
    let obj = await EntryService.getEntryById(id, targetYear, targetMonth);
    if (!obj) {
      return res.status(404).json({ message: "Entry not found" });
    }
    res.send(obj);
  } catch (error) {
    next(error);
  }
});

router.post("/:year/:month", validateMonthYear, async (req, res, next) => {
  try {
    const { targetYear, targetMonth } = req;
    let obj = req.body;
    const keys = Object.keys(obj);
    for (let key of keys) {
      if (typeof obj[key] == "string") {
        obj[key] = normalizeNewlines(obj[key]);
      }
    }
    if (obj.date) {
      const entryDate = new Date(obj.date);
      if (entryDate.getFullYear() !== targetYear || (entryDate.getMonth() + 1) !== targetMonth) {
        console.warn(`Attempted to add entry for date ${obj.date} into collection for ${targetYear}/${targetMonth}. Mismatch detected.`);
      }
    }
    obj = await EntryService.addEntry(obj, targetYear, targetMonth);
    res.status(201).json(obj);
  } catch (error) {
    next(error);
  }
});

router.post("/:year/:month/bulk-add-or-update", validateMonthYear, async (req, res, next) => {
  let entries = req.body;
  if (!Array.isArray(entries)) {
    return res.status(400).json({ message: "Invalid input, expected an array of entries." });
  }
  try {
    const { targetYear, targetMonth } = req;
    const result = await EntryService.bulkAddOrUpdateEntries(entries, targetYear, targetMonth);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.put("/:year/:month/:id", upload.any(), validateMonthYear, async (req, res, next) => {
  try {
    const { targetYear, targetMonth } = req;
    const entryId = req.params.id;
    const fieldsToUpdate = req.body;
    fieldsToUpdate.updateDate = new Date();

    if (fieldsToUpdate.date) {
      const updateDate = new Date(fieldsToUpdate.date);
      if (updateDate.getFullYear() !== targetYear || (updateDate.getMonth() + 1) !== targetMonth) {
        console.warn(`Attempted to update entry date to ${fieldsToUpdate.date} in collection for ${targetYear}/${targetMonth}. Mismatch detected.`);
      }
    }

    let updatedEntry = await EntryService.updateEntry(entryId, fieldsToUpdate, targetYear, targetMonth);

    if (!updatedEntry) {
      return res.status(404).json({ message: "Entry not found for update." });
    }

    res.status(200).json(updatedEntry);
  } catch (error) {
    next(error);
  }
});

router.put("/:year/:month/bulk-update", upload.any(), validateMonthYear, async (req, res, next) => {
  let entries = req.body;
  if (!Array.isArray(entries)) {
    return res.status(400).json({ message: "Invalid input, expected array" });
  }
  try {
    const { targetYear, targetMonth } = req;
    let result = await EntryService.updateManyEntries(entries, targetYear, targetMonth);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.delete("/:year/:month/:id", validateMonthYear, async (req, res, next) => {
  try {
    const { targetYear, targetMonth } = req;
    let id = req.params.id;
    let obj = await EntryService.deleteEntry(id, targetYear, targetMonth);
    if (obj && obj.deletedCount === 0) {
      return res.status(404).json({ message: "Entry not found for deletion." });
    }
    res.json(obj);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
