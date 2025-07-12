const express = require("express");
const router = express.Router();
const AreaService = require("../services/area.service");
const multer = require("multer");
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
    let list = await AreaService.getAllAreas();
    res.status(200).json(list);
  } catch (error) {
    next(error); // Send error to middleware
  }
});
router.get("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    res.send(AreaService.getAreaById(id));
  } catch (error) {
    next(error); // Send error to middleware
  }
});
router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    let obj = req.body;
    obj.addDate = new Date();
    obj.updateDate = new Date();
    obj = await AreaService.addArea(obj);
    res.status(201).json(obj);
  } catch (error) {
    next(error); // Send error to middleware
  }
});
router.put("/", upload.single("file"), async (req, res, next) => {
  try {
    let obj = req.body;
    obj.updateDate = new Date();
    obj = await AreaService.updateArea(obj);
    res.status(200).json(obj);
  } catch (error) {
    next(error); // Send error to middleware
  }
});
router.delete("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    let obj = req.body;
    obj = await AreaService.deleteArea(id);
    res.json(obj);
  } catch (error) {
    next(error); // Send error to middleware
  }
});

module.exports = router;
