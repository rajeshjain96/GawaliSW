const express = require("express");
const router = express.Router();
const PaymentService = require("../services/payment.service");
const multer = require("multer");
const { normalizeNewlines } = require("../services/utilities/lib");
const { ObjectId } = require("mongodb");

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
    let list = await PaymentService.getAllPayments();
    res.status(200).json(list);
  } catch (error) {
    console.error("error in GET /payments:", error);
    res
      .status(500)
      .json({
        message: "Internal Server Error fetching payments.",
        error: error.message,
        stack: error.stack,
      });
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    let obj = await PaymentService.getPaymentById(id);
    if (!obj) {
      return res.status(404).json({ message: "Payment not found" });
    }
    res.status(200).json(obj);
  } catch (error) {
    console.error(`error in GET /payments/${req.params.id}:`, error);
    res
      .status(500)
      .json({
        message: "Internal Server Error fetching payment by ID.",
        error: error.message,
        stack: error.stack,
      });
  }
});

router.post("/", async (req, res, next) => {
  try {
    let obj = req.body;
    console.log("Request Body:", obj);
    obj.addDate = new Date();
    obj.updateDate = new Date();

    let result = await PaymentService.addPayment(obj);
    console.log("Successfully added new monthly payment record:", result);
    res.status(201).json(result);
  } catch (error) {
    console.error("ERROR in POST /payments (add monthly bill):", error);
    res
      .status(500)
      .json({
        message: "Internal Server Error on POST /payments.",
        error: error.message,
        stack: error.stack,
      });
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    let obj = req.body;

    console.log("ID from URL param:", id);
    console.log("Request Body:", obj);
    obj._id = id;
    obj.updateDate = new Date();
    let result = await PaymentService.updatePayment(obj);

    if (result.modifiedCount === 1) {
      obj._id = id;
      res.status(200).json(obj);
    } else if (result.matchedCount === 1 && result.modifiedCount === 0) {
      res
        .status(200)
        .json({
          message: "No changes detected, record not modified.",
          obj: obj,
        });
    } else {
      res.status(404).json({ message: "Payment record not found for update." });
    }
  } catch (error) {
    console.error("error in PUT /payments", error);
    res
      .status(500)
      .json({
        message: "Internal Server Error on PUT /payments/:id.",
        error: error.message,
        stack: error.stack,
      });
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    console.log("ID from URL param:", id);

    let result = await PaymentService.deletePayment(id);
    if (result.deletedCount === 1) {
      res
        .status(200)
        .json({
          message: `Payment record with ID ${id} deleted successfully.`,
        });
    } else {
      res
        .status(404)
        .json({ message: "Payment record not found for deletion." });
    }
  } catch (error) {
    console.error(`ERROR in DELETE /payments/${req.params.id}:`, error);
    res
      .status(500)
      .json({
        message: "Internal Server Error on DELETE.",
        error: error.message,
        stack: error.stack,
      });
  }
});

module.exports = router;
