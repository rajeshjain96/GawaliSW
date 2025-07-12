

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
    let obj = await EntryService.getAllEntryById(id);
    res.send(obj);
    if (!obj) {
      return res.status(404).json({ message: "Entry not found" });
    }
    
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
// router.post("/bulk-add", upload.any(), async (req, res, next) => {
//   let entries = req.body;
// router.post("/bulk-add", async (req, res, next) => {
//     let entries = req.body;
//     console.log("Received entries for bulk-add ", entries);
//   if (!Array.isArray(entries)) {
//     return res.status(400).json({ message: "Invalid input, expected array" });
//   }
//   entries.forEach((e, index) => {
//     e.addDate = new Date();
//     e.updateDate = new Date();
//   });
//   try {
//     let result = await EntryService.addManyEntries(entries);
//     res.status(201).json(result);
//   } catch (error) {
//     next(error); // Send error to middleware
//   }
// });

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

      const existing = await Entry.findOne({ userId, date });

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

router.put("/", upload.any(), async (req, res, next) => {
  try {
    let obj = req.body;
    obj.updateDate = new Date();
    let id = obj._id;
    let result = await EntryService.updateEntry(obj);
    if (result.modifiedCount == 1) {
      obj._id = id;
      res.status(200).json(obj);
    }
  } catch (error) {
    next(error); // Send error to middleware
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
    next(error); // Send error to middleware
  }
});
router.delete("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    let obj = req.body;
    obj = await EntryService.deleteEntry(id);
    res.json(obj);
  } catch (error) {
    next(error); // Send error to middleware
  }
});

module.exports = router;





















// const express = require("express");
// const router = express.Router();
// const multer = require("multer");
// const Entry = require("../models/entry.model"); // using direct model
// const { normalizeNewlines } = require("../services/utilities/lib");

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "./uploads");
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname);
//   },
// });
// const upload = multer({ storage: storage });

// // ✅ Get all entries
// router.get("/", async (req, res, next) => {
//   try {
//     const list = await Entry.find({});
//     res.status(200).json(list);
//   } catch (error) {
//     next(error);
//   }
// });

// // ✅ Get entry by ID
// router.get("/:id", async (req, res, next) => {
//   try {
//     const id = req.params.id;
//     const obj = await Entry.findById(id);
//     if (!obj) {
//       return res.status(404).json({ message: "Entry not found" });
//     }
//     res.json(obj);
//   } catch (error) {
//     next(error);
//   }
// });

// // ✅ Create single entry
// router.post("/", upload.any(), async (req, res, next) => {
//   try {
//     let obj = req.body;
//     const keys = Object.keys(obj);
//     for (let key of keys) {
//       if (typeof obj[key] === "string") {
//         obj[key] = normalizeNewlines(obj[key]);
//       }
//     }
//     obj.addDate = new Date();
//     obj.updateDate = new Date();

//     const newEntry = new Entry(obj);
//     await newEntry.save();
//     res.status(201).json(newEntry);
//   } catch (error) {
//     next(error);
//   }
// });

// // ✅ Bulk add or update (upsert)
// router.post("/bulk-add", async (req, res, next) => {
//   const entries = req.body;
//   console.log("Received entries for bulk-add", entries);

//   if (!Array.isArray(entries)) {
//     return res.status(400).json({ message: "Invalid input, expected array" });
//   }

//   try {
//     const result = [];

//     for (const entry of entries) {
//       const { userId, date } = entry;

//       // Normalize string fields
//       const keys = Object.keys(entry);
//       for (let key of keys) {
//         if (typeof entry[key] === "string") {
//           entry[key] = normalizeNewlines(entry[key]);
//         }
//       }

//       entry.addDate = new Date();
//       entry.updateDate = new Date();

//       const existing = await Entry.findOne({ userId, date });

//       if (existing) {
//         existing.delivered_qty = entry.delivered_qty;
//         existing.entry_status = entry.entry_status;
//         existing.updateDate = new Date();
//         await existing.save();
//         result.push(existing);
//       } else {
//         const newEntry = new Entry(entry);
//         await newEntry.save();
//         result.push(newEntry);
//       }
//     }

//     res.status(201).json(result);
//   } catch (error) {
//     console.error("Bulk-add error:", error);
//     next(error);
//   }
// });

// // ✅ Update single entry by ID
// router.put("/", upload.any(), async (req, res, next) => {
//   try {
//     const obj = req.body;
//     const id = obj._id;

//     obj.updateDate = new Date();

//     const updated = await Entry.findByIdAndUpdate(id, obj, { new: true });

//     if (!updated) {
//       return res.status(404).json({ message: "Entry not found" });
//     }

//     res.status(200).json(updated);
//   } catch (error) {
//     next(error);
//   }
// });

// // ✅ Bulk update entries
// router.put("/bulk-update", async (req, res, next) => {
//   const entries = req.body;

//   if (!Array.isArray(entries)) {
//     return res.status(400).json({ message: "Invalid input, expected array" });
//   }

//   try {
//     const results = [];

//     for (const entry of entries) {
//       const id = entry._id;
//       entry.updateDate = new Date();
//       const updated = await Entry.findByIdAndUpdate(id, entry, { new: true });
//       if (updated) results.push(updated);
//     }

//     res.status(200).json(results);
//   } catch (error) {
//     next(error);
//   }
// });

// // ✅ Delete entry by ID
// router.delete("/:id", async (req, res, next) => {
//   try {
//     const id = req.params.id;
//     const deleted = await Entry.findByIdAndDelete(id);
//     if (!deleted) {
//       return res.status(404).json({ message: "Entry not found" });
//     }
//     res.json({ message: "Deleted successfully", id });
//   } catch (error) {
//     next(error);
//   }
// });

// module.exports = router;









