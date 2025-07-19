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
  if (obj.date instanceof Date) {
    obj.date = obj.date.toISOString().split('T')[0];
  } else if (typeof obj.date === 'string' && obj.date.includes('T')) {
    obj.date = obj.date.split('T')[0];
  }

  let result = await collection.insertOne(obj);
  obj._id = result.insertedId;
  return obj;
}

async function addManyEntries(entries) {
  const db = app.locals.db;
  const collection = db.collection("entries");
  const processedEntries = entries.map(entry => {
    const newEntry = { ...entry };
    if (newEntry.date instanceof Date) {
      newEntry.date = newEntry.date.toISOString().split('T')[0];
    } else if (typeof newEntry.date === 'string' && newEntry.date.includes('T')) {
      newEntry.date = newEntry.date.split('T')[0];
    }
    return newEntry;
  });

  const result = await collection.insertMany(processedEntries);
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
    
    if (fieldsToUpdate.date instanceof Date) {
      fieldsToUpdate.date = fieldsToUpdate.date.toISOString().split('T')[0];
    } else if (typeof fieldsToUpdate.date === 'string' && fieldsToUpdate.date.includes('T')) {
      fieldsToUpdate.date = fieldsToUpdate.date.split('T')[0];
    }

    return {
      updateOne: {
        filter: { _id: ObjectId.createFromHexString(_id) },
        update: { $set: { ...fieldsToUpdate, updateDate: new Date() } },
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

async function updateEntry(entryId, fieldsToUpdate) {
  const db = app.locals.db;
  const collection = db.collection("entries");

  fieldsToUpdate.updateDate = new Date();

  if (fieldsToUpdate.date instanceof Date) {
    fieldsToUpdate.date = fieldsToUpdate.date.toISOString().split('T')[0];
  } else if (typeof fieldsToUpdate.date === 'string' && fieldsToUpdate.date.includes('T')) {
    fieldsToUpdate.date = fieldsToUpdate.date.split('T')[0];
  }

  let objectIdToQuery;
  try {
    objectIdToQuery = ObjectId.createFromHexString(entryId);
    console.log(`Backend Debug: updateEntry - Converted entryId "${entryId}" to ObjectId:`, objectIdToQuery);
    console.log(`Backend Debug: updateEntry - Is converted ObjectId valid?`, ObjectId.isValid(objectIdToQuery));
  } catch (e) {
    console.error(`Backend Error: Failed to create ObjectId from "${entryId}":`, e);
    return null;
  }

  try {
    const foundDoc = await collection.findOne({ _id: objectIdToQuery });
    console.log(`Backend Debug: updateEntry - Result of pre-update findOne for _id ${objectIdToQuery}:`, foundDoc);
    if (!foundDoc) {
      console.error(`Backend Error: updateEntry - findOne did NOT find document with _id ${objectIdToQuery}.`);
      return null;
    }
  } catch (findError) {
    console.error(`Backend Error: updateEntry - Error during pre-update findOne for _id ${objectIdToQuery}:`, findError);
    return null;
  }

  let updatedDocument = null;
  try {
    const updateOperationResult = await collection.findOneAndUpdate(
      { _id: objectIdToQuery },
      { $set: fieldsToUpdate },
      { returnDocument: 'after' }
    );

    console.log(`Backend Debug: updateEntry - Raw result from findOneAndUpdate for _id ${objectIdToQuery}:`, updateOperationResult);
    
    if (updateOperationResult && updateOperationResult.value) {
        updatedDocument = updateOperationResult.value;
    } else if (updateOperationResult && updateOperationResult._id) {
        updatedDocument = updateOperationResult;
        console.warn('Backend Warning: findOneAndUpdate.value was empty, but raw result contained the updated document (potentially older driver behavior).');
    } else {
        console.warn('Backend Warning: findOneAndUpdate returned no value. Attempting manual re-fetch.');
        updatedDocument = await collection.findOne({ _id: objectIdToQuery });
    }
    
    console.log(`Backend Debug: updateEntry - Extracted updatedDocument:`, updatedDocument);

  } catch (updateError) {
    console.error(`Backend Error: updateEntry - Error during findOneAndUpdate for _id ${objectIdToQuery}:`, updateError);
    return null;
  }

  if (!updatedDocument) {
    console.error(`Entry with ID ${entryId} not found for update in service (after findOneAndUpdate returned no value).`);
    return null;
  }

  return updatedDocument;
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