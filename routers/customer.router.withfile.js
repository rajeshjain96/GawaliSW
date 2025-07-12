const express = require("express");
const router = express.Router();
const Entry = require("../models/entry.model"); // Use the model directly
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// ✅ Get all entries
router.get("/", async (req, res) => {
  try {
    const list = await Entry.find({});
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: "Error fetching entries", error });
  }
});

// ✅ Get entry by ID
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const obj = await Entry.findById(id);
    if (!obj) {
      return res.status(404).json({ message: "Entry not found" });
    }
    res.status(200).json(obj);
  } catch (error) {
    res.status(500).json({ message: "Error fetching entry", error });
  }
});

// ✅ Create a new entry
router.post("/", async (req, res) => {
  try {
    const obj = req.body;
    obj.addDate = new Date();
    obj.updateDate = new Date();
    const newEntry = new Entry(obj);
    await newEntry.save();
    res.status(201).json(newEntry);
  } catch (error) {
    res.status(500).json({ message: "Error adding entry", error });
  }
});

// ✅ Update entry (optionally with image)
router.put("/", upload.single("image_file"), async (req, res) => {
  try {
    const obj = req.body;
    obj.updateDate = new Date();
    const updated = await Entry.findByIdAndUpdate(obj._id, obj, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Entry not found" });
    }
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating entry", error });
  }
});

// ✅ Delete entry
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await Entry.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Entry not found" });
    }
    res.json({ message: "Deleted successfully", id });
  } catch (error) {
    res.status(500).json({ message: "Error deleting entry", error });
  }
});

module.exports = router;














// const express = require("express");
// const router = express.Router();
// // const ProductService = require("../services/product.service");
// const CustomerService = require("../services/customer.service");

// const multer = require("multer");
// // const upload = multer({ dest: "uploads/" });
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "./uploads");
//   },
//   filename: function (req, file, cb) {
//     // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
//     cb(null, file.originalname);
//   },
// });
// const upload = multer({ storage: storage });
// router.get("/", async (req, res) => {
//   let list = await CustomerService.getAllCustomers();
//   res.status(200).json(list);
// });
// router.get("/:id", async (req, res) => {
//   let id = req.params.id;
//   res.send(CustomerService.getCustomerById(id));
// });
// router.post("/", async (req, res) => {
//   let obj = req.body;
//   obj.lastModified = new Date();
//   obj.lastUpdated = new Date();
//   obj = await CustomerService.addCustomer(obj);
//   res.status(201).json(obj);
// });
// router.put("/", upload.single("image_file"), async (req, res) => {
//   let obj = req.body;
//   obj.updateDate = new Date();
//   obj = await CustomerService.updateCustomer(obj);
//   res.status(200).json(obj);
// });
// router.delete("/:id", async (req, res) => {
//   let id = req.params.id;
//   let obj = req.body;
//   obj = await CustomerService.deleteCustomer(id);
//   res.json(obj);
// });

// module.exports = router;
