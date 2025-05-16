const express = require("express");
var cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const { app } = require("./init.js");

var cors = require("cors");
const productRouter = require("./routers/product.router.js");
const customerRouter = require("./routers/customer.router.js");
const fruitRouter = require("./routers/fruits.router.js");
const userRouter = require("./routers/user.router.js");
const roleRouter = require("./routers/role.router.js");
const categoryRouter = require("./routers/category.router.js");
const staffRouter = require("./routers/staff.router.js");
const fileRouter = require("./routers/file.router.js");
const specialRouter = require("./routers/special.router.js");
const logger = require("./logger");
const errorLogger = require("./errorLogger");

const SECRET_KEY = "aaappuuqq";
// app.use(cors());
app.use(cors({ origin: "http://localhost:5173", credentials: true })); // allow cookies
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
// Activity logging middleware

app.use("/specials", specialRouter); // authentication not required
app.use("/users", userRouter); // authentication done inside this file
app.use("/products", auntheticateUser, logActivity, productRouter);
app.use("/customers", auntheticateUser, logActivity, customerRouter);
app.use("/roles", auntheticateUser, logActivity, roleRouter);
app.use("/categories", categoryRouter);
app.use("/staff", staffRouter);
app.use("/files", fileRouter);
app.use("/uploadedImages", express.static("uploads"));
app.use(errorLogger); // This should be the last middleware.
function auntheticateUser(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    // This is unauthorized way... but before responding let us add to log
    req.activity = "Unauthorized";
    next();
    return; //**Important */
    // return res.sendStatus(401); // Unauthorized
  }
  jwt.verify(token, SECRET_KEY, (err, tokenData) => {
    if (err) {
      // There might be tempering with the token... but before responding let us add to log
      req.activity = "Forbidden";
      next();
      return;
      // return res.sendStatus(403); // Forbidden
    }
    if (tokenData.role == "guest") {
      // Guest is trying to do the things illegally
      // but before responding let us add to log
      req.activity = "guestActivity";
      next();
      return;
      // return res.sendStatus(401); // Unauthorized
    }
    // token seems to be of valid logged-in user
    req.tokenData = tokenData; // Attach user info to request
    next();
  });
}
function logActivity(req, res, next) {
  if (req.activity == "Unauthorized") {
    logger.warn(
      `Unauthorized operation -->` + req.method + "--->" + req.baseUrl.slice(1)
    );
    return res.sendStatus(401);
  } else if (req.activity == "Forbidden") {
    logger.warn(
      `Forbidden operation -->` + req.method + "--->" + req.baseUrl.slice(1)
    );
    return res.sendStatus(403);
  } else if (req.activity == "guestActivity") {
    logger.warn(
      `Guest's illegal operation -->` +
        req.method +
        "--->" +
        req.baseUrl.slice(1)
    );
    return res.sendStatus(401); // Unauthorized
  }
  logger.info(
    req.tokenData.name + "-->" + req.method + "--->" + req.baseUrl.slice(1)
  );
  next();
}
