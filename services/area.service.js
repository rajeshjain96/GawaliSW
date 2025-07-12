const { app } = require("../init.js");
const { ObjectId } = require("mongodb");
async function getAllAreas() {
  const db = app.locals.db;
  const collection = db.collection("areas");
  let list = await collection.find().toArray();
  return list;
}
async function getAreaById(id) {
  let obj = await Area.findById(id);
  return obj;
}
async function addArea(obj) {
  const db = app.locals.db;
  const collection = db.collection("areas");
  let response = await collection.insertOne(obj);
  return obj;
}
async function updateArea(obj) {
  const db = app.locals.db;
  const collection = db.collection("areas");
  let id = obj._id;
  delete obj._id;
  obj = await collection.updateOne(
    { _id: ObjectId.createFromHexString(id) },
    { $set: obj }
  );
  console.log("Updated");
  return obj;
}
async function deleteArea(id) {
  const db = app.locals.db;
  const collection = db.collection("areas");
  let obj = await collection.deleteOne({
    _id: ObjectId.createFromHexString(id),
  });
  return obj;
}
module.exports = AreaService = {
  getAllAreas,
  getAreaById,
  addArea,
  updateArea,
  deleteArea,
};
