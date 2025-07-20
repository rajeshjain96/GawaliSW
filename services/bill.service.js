const { app } = require("../init.js");
const { ObjectId } = require("mongodb");

async function getAllBills() {
  const db = app.locals.db;
  const collection = db.collection("bills");
  let list = await collection.find().toArray();
  return list;
}

async function getBillById(id) {
  const db = app.locals.db;
  const collection = db.collection("bills");
  const billObj = await collection.findOne({
    _id: ObjectId.createFromHexString(id),
  });
  console.log(billObj);
  return billObj;
}

async function addBill(obj) {
  console.log("add:", obj);
  const db = app.locals.db;
  const collection = db.collection("bills");
  const keys = Object.keys(obj);
  for (let key of keys) {
    if (typeof obj[key] === "string") {
      obj[key] = normalizeNewlines(obj[key]);
    }
  }
  obj.totalDelivered = parseFloat(obj.totalDelivered) || 0;
  obj.totalMonthlyAmount = parseFloat(obj.totalMonthlyAmount) || 0;
  obj.paidAmount = parseFloat(obj.paidAmount) || 0;
  obj.balanceAmount = parseFloat(obj.balanceAmount) || 0;

  let result = await collection.insertOne(obj);
  obj._id = result.insertedId; 
  console.log("Result of 1 addpay:", result);
  return obj;
}

async function addManyBills(bills) {
  const db = app.locals.db;
  const collection = db.collection("bills");
  const result = await collection.insertMany(bills);
  const insertedIds = Object.values(result.insertedIds);
  const insertedDocs = await collection
    .find({ _id: { $in: insertedIds } })
    .toArray();
  return insertedDocs;
}

async function updateManyBills(bills) {
  const db = app.locals.db;
  const collection = db.collection("bills");
  const operations = bills.map((user) => {
    const { _id, ...fieldsToUpdate } = user;
    return {
      updateOne: {
        filter: { _id: ObjectId.createFromHexString(_id) },
        update: { $set: fieldsToUpdate },
      },
    };
  });
  const result = await collection.bulkWrite(operations);
  const updatedIds = bills.map((u) => ObjectId.createFromHexString(u._id));
  const updatedBills = await collection 
    .find({ _id: { $in: updatedIds } })
    .toArray();
  return updatedBills; 
}

async function updateBill(obj) {
  console.log("update:", obj);
  const db = app.locals.db;
  const collection = db.collection("bills");
  let id = obj._id; 

  obj.totalDelivered = parseFloat(obj.totalDelivered) || 0;
  obj.totalMonthlyAmount = parseFloat(obj.totalMonthlyAmount) || 0;
  obj.paidAmount = parseFloat(obj.paidAmount) || 0;
  obj.balanceAmount = parseFloat(obj.balanceAmount) || 0; 
  delete obj._id; 

  let result = await collection.updateOne(
    { _id: ObjectId.createFromHexString(id) },
    { $set: obj }
  );
  console.log("Result from update :", result);
  return result;
}

async function deleteBill(id) {
  console.log("delete:", id);
  const db = app.locals.db;
  const collection = db.collection("bills");
  let result = await collection.deleteOne({
    _id: ObjectId.createFromHexString(id),
  });
  console.log("Result delete:", result);
  return result;
}

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, "\n");
}

module.exports = EntryService = {
  getAllBills,
  getBillById, 
  addBill,
  addManyBills,
  updateManyBills,
  updateBill, 
  deleteBill, 
};