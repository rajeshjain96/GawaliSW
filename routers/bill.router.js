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
    if (!obj) {
      return res.status(404).json({ message: "Bill not found" });
    }
    res.send(obj);
  } catch (error) {
    if (error.name === 'BSONTypeError' || error.name === 'CastError') {
      return res.status(400).json({ message: "Invalid Bill ID format." });
    }
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

router.post("/bulk-add", async (req, res, next) => {
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
    } else {
      return res.status(404).json({ message: "Bill not found or not modified." });
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
    let result = await BillService.deleteBill(id);

    if (result && result.deletedCount === 0) {
      return res.status(404).json({ message: "Bill not found for deletion." });
    }
    res.json(result);
  } catch (error) {
    if (error.name === 'BSONTypeError' || error.name === 'CastError') {
      return res.status(400).json({ message: "Invalid Bill ID format." });
    }
    next(error);
  }
});


router.get("/:year/:month", validateMonthYear, async (req, res, next) => {
  try {
    const { targetYear, targetMonth } = req;
    let list = await BillService.getAllBills(targetYear, targetMonth);
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
});

router.get("/:year/:month/:id", validateMonthYear, async (req, res, next) => {
  try {
    const { targetYear, targetMonth } = req;
    let id = req.params.id;
    let obj = await BillService.getBillById(id, targetYear, targetMonth);
    if (!obj) {
      return res.status(404).json({ message: "Bill not found" });
    }
    res.send(obj);
  } catch (error) {
    if (error.name === 'BSONTypeError' || error.name === 'CastError') {
      return res.status(400).json({ message: "Invalid Bill ID format." });
    }
    next(error);
  }
});

router.post("/:year/:month", upload.any(), validateMonthYear, async (req, res, next) => {
  try {
    const { targetYear, targetMonth } = req;
    let obj = req.body;
    const keys = Object.keys(obj);
    for (let key of keys) {
      if (typeof obj[key] == "string") {
        obj[key] = normalizeNewlines(obj[key]);
      }
    }
    obj.addDate = new Date();
    obj.updateDate = new Date();

    obj = await BillService.addBill(obj, targetYear, targetMonth);
    res.status(201).json(obj);
  } catch (error) {
    next(error);
  }
});

router.post("/:year/:month/bulk-add", validateMonthYear, async (req, res, next) => {
  let bills = req.body;
  if (!Array.isArray(bills)) {
    return res.status(400).json({ message: "Invalid input, expected array" });
  }
  bills.forEach((e, index) => {
    e.addDate = new Date();
    e.updateDate = new Date();
  });
  try {
    const { targetYear, targetMonth } = req;
    let result = await BillService.addManyBills(bills, targetYear, targetMonth);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.put("/:year/:month", upload.any(), validateMonthYear, async (req, res, next) => {
  try {
    const { targetYear, targetMonth } = req;
    let obj = req.body;
    obj.updateDate = new Date();
    let id = obj._id;
    let result = await BillService.updateBill(obj, targetYear, targetMonth);
    if (result && result.modifiedCount == 1) {
      obj._id = id;
      res.status(200).json(obj);
    } else {
      return res.status(404).json({ message: "Bill not found or not modified." });
    }
  } catch (error) {
    next(error);
  }
});

router.put("/:year/:month/bulk-update", validateMonthYear, async (req, res, next) => {
  let bills = req.body;
  if (!Array.isArray(bills)) {
    return res.status(400).json({ message: "Invalid input, expected array" });
  }
  bills.forEach((e, index) => {
    e.updateDate = new Date();
  });
  try {
    const { targetYear, targetMonth } = req;
    let result = await BillService.updateManyBills(bills, targetYear, targetMonth);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.delete("/:year/:month/:id", validateMonthYear, async (req, res, next) => {
  try {
    const { targetYear, targetMonth } = req;
    let id = req.params.id;
    let result = await BillService.deleteBill(id, targetYear, targetMonth);

    if (result && result.deletedCount === 0) {
      return res.status(404).json({ message: "Bill not found for deletion." });
    }
    res.json(result);
  } catch (error) {
    if (error.name === 'BSONTypeError' || error.name === 'CastError') {
      return res.status(400).json({ message: "Invalid Bill ID format." });
    }
    next(error);
  }
});

module.exports = router;