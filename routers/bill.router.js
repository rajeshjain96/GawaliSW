const express = require("express");
const router = express.Router();
const BillService = require("../services/bill.service");
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
    let list = await BillService.getAllBills();
    res.status(200).json(list);
  } catch (error) {
    next(error); 
  }
});
router.get("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    let obj = await BillService.getBillById(id);
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
    obj = await BillService.addBill(obj);
    res.status(201).json(obj);
  } catch (error) {
    next(error); 
  }
});

router.post("/bulk-add",  async (req, res, next) => {
  let bills = req.body;
  if (!Array.isArray(bills)) {
    return res.status(400).json({ message: "Invalid input, expected array" });
  }
  bills.forEach((e, index) => {
    e.addDate = new Date();
    e.updateDate = new Date();
  });
  try {
    let result = await BillService.addManyBills(bills);
    res.status(201).json(result);
  } catch (error) {
    next(error); 
  }
});
router.put("/", upload.any(), async (req, res, next) => {
  try {
    let obj = req.body;
    obj.updateDate = new Date();
    let id = obj._id;
    let result = await BillService.updateBill(obj);
    if (result.modifiedCount == 1) {
      obj._id = id;
      res.status(200).json(obj);
    }
  } catch (error) {
    next(error); 
  }
});

router.put("/bulk-update", async (req, res, next) => {
  let bills = req.body;
  if (!Array.isArray(bills)) {
    return res.status(400).json({ message: "Invalid input, expected array" });
  }
  bills.forEach((e, index) => {
    e.updateDate = new Date();
  });
  try {
    let result = await BillService.updateManyBills(bills);
    res.status(201).json(result);
  } catch (error) {
    next(error); 
  }
});
router.delete("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    let obj = req.body;
    obj = await BillService.deleteBill(id);
    res.json(obj);
  } catch (error) {
    next(error); 
  }
});

module.exports = router;