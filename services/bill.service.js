const { app } = require("../init.js");
const { ObjectId } = require("mongodb");

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, "\n");
}

function getBillCollectionName(year, month) {
  const formattedMonth = String(month).padStart(2, '0');
  return `bills_${year}_${formattedMonth}`;
}

async function getBillCollection(year, month) {
  const db = app.locals.db;
  const collectionName = getBillCollectionName(year, month);
  return db.collection(collectionName);
}

async function getAllBills(year, month) {
  const collection = await getBillCollection(year, month);
  let list = await collection.find().toArray();
  return list;
}

async function getBillById(id, year, month) {
  const collection = await getBillCollection(year, month);
  const billObj = await collection.findOne({
    _id: ObjectId.createFromHexString(id),
  });
  console.log(billObj);
  return billObj;
}

async function addBill(obj, year, month) {
  console.log("add:", obj);
  const collection = await getBillCollection(year, month);
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

async function addManyBills(bills, year, month) {
  const collection = await getBillCollection(year, month);
  const result = await collection.insertMany(bills);
  const insertedIds = Object.values(result.insertedIds);
  const insertedDocs = await collection
    .find({ _id: { $in: insertedIds } })
    .toArray();
  return insertedDocs;
}

async function updateManyBills(bills, year, month) {
  const collection = await getBillCollection(year, month);
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

async function updateBill(obj, year, month) {
  console.log("update:", obj);
  const collection = await getBillCollection(year, month);
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

async function deleteBill(id, year, month) {
  console.log("delete:", id);
  const collection = await getBillCollection(year, month);
  let result = await collection.deleteOne({
    _id: ObjectId.createFromHexString(id),
  });
  console.log("Result delete:", result);
  return result;
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