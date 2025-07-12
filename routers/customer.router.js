const express = require("express");
const router = express.Router();
const CustomerService = require("../services/customer.service");
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
    let list = await CustomerService.getAllCustomers();
    res.status(200).json(list);
  } catch (error) {
    next(error); // Send error to middleware
  }
});
router.get("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    let obj = await CustomerService.getCustomerById(id);
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
    obj.addDate = new Date();
    obj.updateDate = new Date();
    obj = await CustomerService.addCustomer(obj);
    res.status(201).json(obj);
  } catch (error) {
    next(error); // Send error to middleware
  }
});
router.post("/bulk-add", upload.any(), async (req, res, next) => {
  let customers = req.body;
  if (!Array.isArray(customers)) {
    return res.status(400).json({ message: "Invalid input, expected array" });
  }
  customers.forEach((e, index) => {
    e.addDate = new Date();
    e.updateDate = new Date();
  });
  try {
    let result = await CustomerService.addManyCustomers(customers);
    res.status(201).json(result);
  } catch (error) {
    next(error); // Send error to middleware
  }
});
router.put("/", upload.any(), async (req, res, next) => {
  try {
    let obj = req.body;
    obj.updateDate = new Date();
    let id = obj._id;
    let result = await CustomerService.updateCustomer(obj);
    if (result.modifiedCount == 1) {
      obj._id = id;
      res.status(200).json(obj);
    }
  } catch (error) {
    next(error); // Send error to middleware
  }
});
router.put("/bulk-update", upload.any(), async (req, res, next) => {
  let customers = req.body;
  if (!Array.isArray(customers)) {
    return res.status(400).json({ message: "Invalid input, expected array" });
  }
  customers.forEach((e, index) => {
    e.updateDate = new Date();
  });
  try {
    let result = await CustomerService.updateManyCustomers(customers);
    res.status(201).json(result);
  } catch (error) {
    next(error); // Send error to middleware
  }
});
router.delete("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    let obj = req.body;
    obj = await CustomerService.deleteCustomer(id);
    res.json(obj);
  } catch (error) {
    next(error); // Send error to middleware
  }
});

module.exports = router;
