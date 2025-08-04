// last_entry.router.js (MODIFIED)

const express = require("express");
const router = express.Router();
const Last_EntryService = require("../services/last_entry.service");
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

// *** MODIFIED ROUTE START ***
// This endpoint (GET /last_entry/) will now fetch the single latest entry document
// from the 'last_entries' collection based on updateDate.
// This replaces the old `router.get("/")` that fetched all entries.
router.get("/", async (req, res, next) => {
    try {
        let latestEntryDoc = await Last_EntryService.getLatestOverallEntry();
        // Return the entire document, or just the date field if that's all you need
        // Assuming the document will have a 'date' field.
        // If no document exists, it will return null.
        res.status(200).json({ latestEntry: latestEntryDoc });
    } catch (error) {
        next(error);
    }
});

router.post("/update-if-latest", async (req, res, next) => {
  try {
    const { newDate } = req.body;

    if (!newDate) {
      return res.status(400).json({ message: "newDate is required" });
    }

    const result = await Last_EntryService.updateIfLatestDate(newDate);

    if (result.updated) {
      res.status(200).json({ message: "Last entry updated", doc: result.newDoc });
    } else {
      res.status(200).json({ message: result.message || "Not updated", updated: false });
    }
  } catch (error) {
    next(error);
  }
});

// *** MODIFIED ROUTE END ***

// *** REMOVED OR MOVED ROUTE START ***
// The previous router.get("/global") is removed.
// If you still need to get ALL last_entry records, you'd need a new route like:
/*
router.get("/all", async (req, res, next) => { // New route for fetching all
    try {
      let list = await Last_EntryService.getAllLast_Entrys();
      res.status(200).json(list);
    } catch (error) {
      next(error);
    }
});
*/
// *** REMOVED OR MOVED ROUTE END ***

router.get("/:id", async (req, res, next) => {
    try {
      let id = req.params.id;
      let obj = await Last_EntryService.getLast_EntryById(id);
      res.send(obj);
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
      obj.addDate = new Date(); // These are crucial for sorting
      obj.updateDate = new Date(); // These are crucial for sorting
      obj = await Last_EntryService.addLast_Entry(obj);
      res.status(201).json(obj);
    } catch (error) {
      next(error); // Send error to middleware
    }
  });
  router.post("/bulk-add", upload.any(), async (req, res, next) => {
    let last_entries = req.body;
    if (!Array.isArray(last_entries)) {
      return res.status(400).json({ message: "Invalid input, expected array" });
    }
    last_entries.forEach((e, index) => {
      e.addDate = new Date();
      e.updateDate = new Date();
    });
    try {
      let result = await Last_EntryService.addManyLast_Entrys(last_entries);
      res.status(201).json(result);
    } catch (error) {
      next(error); // Send error to middleware
    }
  });
  router.put("/", upload.any(), async (req, res, next) => {
    try {
      let obj = req.body;
      obj.updateDate = new Date(); // This is crucial for sorting
      let id = obj._id;
      let result = await Last_EntryService.updateLast_Entry(obj);
      if (result.modifiedCount == 1) {
        obj._id = id;
        res.status(200).json(obj);
      }
    } catch (error) {
      next(error); // Send error to middleware
    }
  });
  router.put("/bulk-update", upload.any(), async (req, res, next) => {
    let last_entries = req.body;
    if (!Array.isArray(last_entries)) {
      return res.status(400).json({ message: "Invalid input, expected array" });
    }
    last_entries.forEach((e, index) => {
      e.updateDate = new Date(); // This is crucial for sorting
    });
    try {
      let result = await Last_EntryService.updateManyLast_Entrys(last_entries);
      res.status(201).json(result);
    } catch (error) {
      next(error); // Send error to middleware
    }
  });
  router.delete("/:id", async (req, res, next) => {
    try {
      let id = req.params.id;
      let obj = req.body;
      obj = await Last_EntryService.deleteLast_Entry(id);
      res.json(obj);
    } catch (error) {
      next(error); // Send error to middleware
    }
  });

module.exports = router;