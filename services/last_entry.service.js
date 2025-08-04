const { app } = require("../init.js");
const { ObjectId } = require("mongodb");

const COLLECTION_NAME = "last_entries"; // Still good

async function getAllLast_Entrys() {
  const db = app.locals.db;
  const collection = db.collection(COLLECTION_NAME);
  let list = await collection.find().toArray();
  return list;
}

async function getLast_EntryById(id) {
  const db = app.locals.db;
  const collection = db.collection(COLLECTION_NAME);
  const last_entryObj = await collection.findOne({
    _id: ObjectId.createFromHexString(id),
  });
  console.log(last_entryObj);
  return last_entryObj;
}

// THIS FUNCTION IS CORRECT: Fetches the single latest document by updateDate
async function getLatestOverallEntry() {
  const db = app.locals.db;
  const collection = db.collection(COLLECTION_NAME);
  const latestDoc = await collection.findOne({}, { sort: { updateDate: -1 } });
  return latestDoc;
}

async function updateIfLatestDate(newDate) {
  const db = app.locals.db;
  const collection = db.collection(COLLECTION_NAME);

  const latestDoc = await collection.findOne({}, { sort: { updateDate: -1 } });

  if (!latestDoc || new Date(newDate) > new Date(latestDoc.date)) {
    const newDoc = {
      date: newDate,
      addDate: new Date(),
      updateDate: new Date(),
    };
    const result = await collection.insertOne(newDoc);
    newDoc._id = result.insertedId;
    return { updated: true, newDoc };
  }

  return { updated: false, message: "Provided date is not newer." };
}


async function addLast_Entry(obj) {
  const db = app.locals.db;
  const collection = db.collection(COLLECTION_NAME);
  const keys = Object.keys(obj);
  for (let key of keys) {
    if (typeof obj[key] === "string") {
      obj[key] = normalizeNewlines(obj[key]);
    }
  }
  obj.addDate = new Date();
  obj.updateDate = new Date();
  let result = await collection.insertOne(obj);
  obj._id = result.insertedId;
  return obj;
}

async function addManyLast_Entrys(last_entries) {
  const db = app.locals.db;
  const collection = db.collection(COLLECTION_NAME);
  const result = await collection.insertMany(last_entries);
  const insertedIds = Object.values(result.insertedIds);
  const insertedDocs = await collection
    .find({ _id: { $in: insertedIds } })
    .toArray();
  return insertedDocs;
}

async function updateManyLast_Entrys(last_entries) {
  const db = app.locals.db;
  const collection = db.collection(COLLECTION_NAME);
  const operations = last_entries.map((last_entry) => {
    const { _id, ...fieldsToUpdate } = last_entry;
    return {
      updateOne: {
        filter: { _id: ObjectId.createFromHexString(_id) },
        update: { $set: fieldsToUpdate },
      },
    };
  });
  const result = await collection.bulkWrite(operations);
  const updatedIds = last_entries.map((u) => ObjectId.createFromHexString(u._id));
  const updatedLast_Entrys = await collection
    .find({ _id: { $in: updatedIds } })
    .toArray();
  return updatedLast_Entrys;
}

async function updateLast_Entry(obj) {
  const db = app.locals.db;
  const collection = db.collection(COLLECTION_NAME);
  let id = obj._id;
  delete obj._id;
  let result = await collection.updateOne(
    { _id: ObjectId.createFromHexString(id) },
    { $set: obj }
  );
  return result;
}

async function deleteLast_Entry(id) {
  const db = app.locals.db;
  const collection = db.collection(COLLECTION_NAME);
  let obj = await collection.deleteOne({
    _id: ObjectId.createFromHexString(id),
  });
  return obj;
}

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, "\n");
}

module.exports = Last_EntryService = {
  getAllLast_Entrys,
  getLast_EntryById,
  getLatestOverallEntry, // Exporting the correct function
  addLast_Entry,
  addManyLast_Entrys,
  updateManyLast_Entrys,
  updateLast_Entry,
  deleteLast_Entry,
  updateIfLatestDate
};