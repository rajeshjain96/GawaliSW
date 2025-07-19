const express = require("express");
const router = express.Router();
// const ProductService = require("../services/product.service");
const EntryService = require("../services/entry.service");

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
router.get("/", async (req, res) => {
  let list = await EntryService.getAllEntries();
  res.status(200).json(list);
});
router.get("/:id", async (req, res) => {
  let id = req.params.id;
  let obj = await EntryService.getEntryById(id);
  res.status(200).json(obj);
  });
router.post("/", async (req, res) => {
  let obj = req.body;
  obj.lastModified = new Date();
  obj.lastUpdated = new Date();
  obj = await EntryService.addEntry(obj);
  res.status(201).json(obj);
});
router.put("/", upload.single("image_file"), async (req, res) => {
  let obj = req.body;
  obj.updateDate = new Date();
  obj = await EntryService.updateEntry(obj);
  res.status(200).json(obj);
});
router.delete("/:id", async (req, res) => {
  let id = req.params.id;
  let obj = req.body;
  obj = await EntryService.deleteEntry(id);
  res.json(obj);
});

module.exports = router;
