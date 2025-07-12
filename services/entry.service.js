
const { app } = require("../init.js");
const { ObjectId } = require("mongodb");

async function getAllEntries() {
  const db = app.locals.db;
  const collection = db.collection("entries");
  let list = await collection.find().toArray();
  return list;
}

async function getEntryById(id) {
  const db = app.locals.db;
  const collection = db.collection("entries");
  const customerObj = await collection.findOne({
    _id: ObjectId.createFromHexString(id),
  });
  console.log(customerObj);
  return customerObj;
}

async function addEntry(obj) {
  const db = app.locals.db;
  const collection = db.collection("entries");
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

async function addManyEntries(entries) {
  const db = app.locals.db;
  const collection = db.collection("entries");
  const result = await collection.insertMany(entries);
  const insertedIds = Object.values(result.insertedIds);
  const insertedDocs = await collection
    .find({ _id: { $in: insertedIds } })
    .toArray();
  return insertedDocs;
}

async function updateManyEntries(entries) {
  const db = app.locals.db;
  const collection = db.collection("entries");
  const operations = entries.map((user) => {
    const { _id, ...fieldsToUpdate } = user;
    return {
      updateOne: {
        filter: { _id: ObjectId.createFromHexString(_id) },
        update: { $set: fieldsToUpdate },
      },
    };
  });
  const result = await collection.bulkWrite(operations);
  const updatedIds = entries.map((u) => ObjectId.createFromHexString(u._id));
  const updatedCustomers = await collection
    .find({ _id: { $in: updatedIds } })
    .toArray();
  return updatedCustomers;
}

async function updateEntry(obj) {
  const db = app.locals.db;
  const collection = db.collection("entries");
  let id = obj._id;
  delete obj._id;
  let result = await collection.updateOne(
    { _id: ObjectId.createFromHexString(id) },
    { $set: obj }
  );
  return result;
}

async function deleteEntry(id) {
  const db = app.locals.db;
  const collection = db.collection("entries");
  let obj = await collection.deleteOne({
    _id: ObjectId.createFromHexString(id),
  });
  return obj;
}

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, "\n");
}

module.exports = EntryService = {
  getAllEntries,
  getEntryById,
  addEntry,
  addManyEntries,
  updateManyEntries,
  updateEntry,
  deleteEntry,
};














// const Entry = require("../models/entry.model");
// const mongoose = require("mongoose");

// function normalizeNewlines(text) {
//   return text.replace(/\r\n/g, "\n");
// }

// // Get all entries
// async function getAllEntries() {
//   return await Entry.find();
// }

// // Get entry by ID
// async function getEntryById(id) {
//   const entry = await Entry.findById(id);
//   return entry;
// }

// // Add a single entry
// async function addEntry(obj) {
//   const keys = Object.keys(obj);
//   for (let key of keys) {
//     if (typeof obj[key] === "string") {
//       obj[key] = normalizeNewlines(obj[key]);
//     }
//   }
//   obj.addDate = new Date();
//   obj.updateDate = new Date();

//   const newEntry = new Entry(obj);
//   const saved = await newEntry.save();
//   return saved;
// }

// // Add multiple entries
// async function addManyEntries(entries) {
//   const normalizedEntries = entries.map((e) => {
//     const entry = { ...e };
//     Object.keys(entry).forEach((key) => {
//       if (typeof entry[key] === "string") {
//         entry[key] = normalizeNewlines(entry[key]);
//       }
//     });
//     entry.addDate = new Date();
//     entry.updateDate = new Date();
//     return entry;
//   });

//   const inserted = await Entry.insertMany(normalizedEntries);
//   return inserted;
// }

// // Update a single entry
// async function updateEntry(obj) {
//   const { _id, ...rest } = obj;
//   rest.updateDate = new Date();

//   const updated = await Entry.findByIdAndUpdate(_id, { $set: rest }, { new: true });
//   return updated;
// }

// // Update multiple entries
// async function updateManyEntries(entries) {
//   const result = [];

//   for (const entry of entries) {
//     const { _id, ...rest } = entry;
//     rest.updateDate = new Date();

//     const updated = await Entry.findByIdAndUpdate(_id, { $set: rest }, { new: true });
//     if (updated) result.push(updated);
//   }

//   return result;
// }

// // Delete entry
// async function deleteEntry(id) {
//   const deleted = await Entry.findByIdAndDelete(id);
//   return deleted;
// }

// module.exports = {
//   getAllEntries,
//   getEntryById,
//   addEntry,
//   addManyEntries,
//   updateEntry,
//   updateManyEntries,
//   deleteEntry,
// };


