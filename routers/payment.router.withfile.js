const express = require("express");
const router = express.Router();
// const ProductService = require("../services/product.service");
const PaymentService = require("../services/payment.service");

const multer = require("multer");
// const upload = multer({ dest: "uploads/" });
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });
router.get("/", async (req, res) => {
  let list = await PaymentService.getAllPayments();
  res.status(200).json(list);
});
router.get("/:id", async (req, res) => {
  let id = req.params.id;
  let obj = await PaymentService.getPaymentById(id);
  res.status(200).json(obj);
  });
router.post("/", async (req, res) => {
  let obj = req.body;
  obj.lastModified = new Date();
  obj.lastUpdated = new Date();
  obj = await PaymentService.addPayment(obj);
  res.status(201).json(obj);
});
router.put("/", upload.single("image_file"), async (req, res) => {
  let obj = req.body;
  obj.updateDate = new Date();
  obj = await PaymentService.updatePayment(obj);
  res.status(200).json(obj);
});
router.delete("/:id", async (req, res) => {
  let id = req.params.id;
  let obj = req.body;
  obj = await PaymentService.deletePayment(id);
  res.json(obj);
});

module.exports = router;

















// const express = require("express");
// const router = express.Router();
// // const ProductService = require("../services/product.service");
// const PaymentService = require("../services/entry.service");

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
//   let list = await PaymentService.getAllPayments();
//   res.status(200).json(list);
// });
// router.get("/:id", async (req, res) => {
//   let id = req.params.id;
//   let obj = await PaymentService.getPaymentById(id);
//   res.status(200).json(obj);
//   });
// router.post("/", async (req, res) => {
//   let obj = req.body;
//   obj.lastModified = new Date();
//   obj.lastUpdated = new Date();
//   obj = await PaymentService.addPayment(obj);
//   res.status(201).json(obj);
// });
// router.put("/", upload.single("image_file"), async (req, res) => {
//   let obj = req.body;
//   obj.updateDate = new Date();
//   obj = await PaymentService.updatePayment(obj);
//   res.status(200).json(obj);
// });
// router.delete("/:id", async (req, res) => {
//   let id = req.params.id;
//   let obj = req.body;
//   obj = await PaymentService.deletePayment(id);
//   res.json(obj);
// });

// module.exports = router;


















// // const express = require("express");
// // const router = express.Router();
// // const PaymentService = require("../services/payment.service");
// // const multer = require("multer");
// // // const upload = multer({ dest: "uploads/" });
// // const storage = multer.diskStorage({
// //   destination: function (req, file, cb) {
// //     cb(null, "./uploads");
// //   },
// //   filename: function (req, file, cb) {
// //     // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
// //     cb(null, file.originalname);
// //   },
// // });
// // const upload = multer({ storage: storage });
// // router.get("/", async (req, res) => {
// //   let list = await PaymentService.getAllPayments();
// //   res.status(200).json(list);
// // });
// // router.get("/:id", async (req, res) => {
// //   let id = req.params.id;
// //   res.send(PaymentService.getPaymentById(id));
// // });
// // router.post("/", async (req, res) => {
// //   let obj = req.body;
// //   obj.lastModified = new Date();
// //   obj.lastUpdated = new Date();
// //   obj = await PaymentService.addPayment(obj);
// //   res.status(201).json(obj);
// // });
// // router.put("/", upload.single("image_file"), async (req, res) => {
// //   let obj = req.body;
// //   obj.updateDate = new Date();
// //   obj = await PaymentService.updatePayment(obj);
// //   res.status(200).json(obj);
// // });
// // router.delete("/:id", async (req, res) => {
// //   let id = req.params.id;
// //   let obj = req.body;
// //   obj = await PaymentService.deletePayment(id);
// //   res.json(obj);
// // });

// // module.exports = router;
