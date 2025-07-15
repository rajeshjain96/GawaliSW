const { app } = require("../init.js");
const { ObjectId } = require("mongodb");

async function getAllPayments() {
  const db = app.locals.db;
  const collection = db.collection("payments");
  let list = await collection.find().toArray();
  return list;
}

async function getPaymentById(id) {
  const db = app.locals.db;
  const collection = db.collection("payments");
  const paymentObj = await collection.findOne({
    _id: ObjectId.createFromHexString(id),
  });
  console.log(paymentObj);
  return paymentObj;
}

async function addPayment(obj) {
  const db = app.locals.db;
  const collection = db.collection("payments");
  const keys = Object.keys(obj);
  for (let key of keys) {
    if (typeof obj[key] === "string") {
      obj[key] = normalizeNewlines(obj[key]);
    }
  }
  let result = await collection.insertOne(obj);
  obj._id = result.insertedId;
  return obj;
}

async function addManyPayments(payments) {
  const db = app.locals.db;
  const collection = db.collection("payments");
  const result = await collection.insertMany(payments);
  const insertedIds = Object.values(result.insertedIds);
  const insertedDocs = await collection
    .find({ _id: { $in: insertedIds } })
    .toArray();
  return insertedDocs;
}

async function updateManyPayments(payments) {
  const db = app.locals.db;
  const collection = db.collection("payments");
  const operations = payments.map((user) => {
    const { _id, ...fieldsToUpdate } = user;
    return {
      updateOne: {
        filter: { _id: ObjectId.createFromHexString(_id) },
        update: { $set: fieldsToUpdate },
      },
    };
  });
  const result = await collection.bulkWrite(operations);
  const updatedIds = payments.map((u) => ObjectId.createFromHexString(u._id));
  const updatedPayments = await collection
    .find({ _id: { $in: updatedIds } })
    .toArray();
  return updatedPayments;
}

// async function updatePayment(obj) {
//   const db = app.locals.db;
//   const collection = db.collection("payments");
//   let id = obj._id;
//   delete obj._id;
//   let result = await collection.updateOne(
//     { _id: ObjectId.createFromHexString(id) },
//     { $set: obj }
//   );
//   return result;
// }
async function updatePayment(obj) {
  const db = app.locals.db;
  const collection = db.collection("payments");
  let id = obj._id;
  if (!id) throw new Error("Missing _id for updatePayment");
  delete obj._id;

  let result = await collection.updateOne(
    { _id: new ObjectId(id) }, // safer than createFromHexString
    { $set: obj }
  );
  return result;
}



async function deletePayment(id) {
  const db = app.locals.db;
  const collection = db.collection("payments");
  let obj = await collection.deleteOne({
    _id: ObjectId.createFromHexString(id),
  });
  return obj;
}

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, "\n");
}

module.exports = PaymentService = {
  getAllPayments,
  getPaymentById,
  addPayment,
  addManyPayments,
  updateManyPayments,
  updatePayment,
  deletePayment,
};





