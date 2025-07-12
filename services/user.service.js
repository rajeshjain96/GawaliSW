const { app } = require("../init.js");
const { ObjectId } = require("mongodb");

async function getAllUsers() {
  const db = app.locals.db;

  const collection = db.collection("users");

  let list = await collection.find().toArray();

  return list;
}
async function getUserById(id) {
  const db = app.locals.db;
  const collection = db.collection("users");
  const userObj = await collection.findOne({
    _id: ObjectId.createFromHexString(id),
  });
  // console.log("Found document is =>", userObj);
  return userObj;

  // let obj = await User.findById(id);
  // return obj;
}
async function getUserByEmailId(emailId) {
  const db = app.locals.db;
  const collection = db.collection("users");
  const userObj = await collection.findOne({
    emailId: emailId,
  });
  if (userObj) {
    return { result: "success" };
  } else {
    return { result: "failed" };
  }
  // return userObj;
}
async function checkUser(obj) {
  const db = app.locals.db;
  const collection = db.collection("users");
  const userObj = await collection.findOne({
    emailId: obj.emailId,
  });
  if (!userObj) {
    // user is not registered
    return { result: "na" };
  } else if (
    obj.password &&
    userObj.password == ""
  ) {
    //First time signup by user, password is being set by the user
    userObj.password = obj.password;
    userObj.status="active";
    userObj._id = userObj._id.toString();
    await updateUser(userObj);
    return { result: "signupSuccess" };
  } else if (userObj.password == "") {
    // first-time, ask user to set the password
    return { result: "setPassword" };
  } else {
    return { result: "alreadySetPassword" };
  }
  // return userObj;
}
async function checkUserTryingToLogIn(obj) {
  const db = app.locals.db;
  const collection = db.collection("users");
  const userObj = await collection.findOne({
    emailId: obj.emailId,
  });
  if (!userObj) {
    // user is not registered
    return { result: "na" };
  } else if (userObj.status == "disabled") {
    return { result: "disabled" };
  } else if (userObj.password == "") {
    //First time login by user, he/she needs to signup first
    return { result: "signupFirst" };
  } else if (userObj.password != obj.password) {
    // wrong password
    return { result: "wrongPassword" };
  } else if (userObj.password === obj.password) {
    // send user to client
    userObj.password = "...";
    delete userObj.mobileNumber;
    // delete userObj.roleId;
    delete userObj.status;
    // delete userObj._id;
    // get role-level
    console.log(
      "Logged in success.. " + userObj.emailId + " " + userObj.roleId
    );
    return { user: userObj, result: "validUser" };
  }
  // return userObj;
}
async function addUser(obj) {
  const db = app.locals.db;
  const collection = db.collection("users");
  let response = await collection.insertOne(obj);
  return obj;
}
async function updateUser(obj) {
  const db = app.locals.db;
  const collection = db.collection("users");
  let id = obj._id;
  delete obj._id;
  if (obj.status == "forgotPassword") {
    obj.password = "";
  }
  obj = await collection.updateOne(
    { _id: ObjectId.createFromHexString(id) },
    { $set: obj }
  );
  return obj;
}
async function deleteUser(id) {
  const db = app.locals.db;
  const collection = db.collection("users");
  let obj = await collection.deleteOne({
    _id: ObjectId.createFromHexString(id),
  });
  return obj;
}
module.exports = UserService = {
  getAllUsers,
  getUserById,
  getUserByEmailId,
  checkUser,
  checkUserTryingToLogIn,
  addUser,
  updateUser,
  deleteUser,
};