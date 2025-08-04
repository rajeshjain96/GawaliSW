const { app } = require("../init.js");
const { ObjectId } = require("mongodb");
const { normalizeNewlines } = require("./utilities/lib");

function getCollectionName(year, month) {
  const formattedMonth = String(month).padStart(2, '0');
  return `entries_${year}_${formattedMonth}`;
}

async function getEntryCollection(year, month) {
  const db = app.locals.db;
  const collectionName = getCollectionName(year, month);
  return db.collection(collectionName);
}

// async function getAllEntries(year, month) {
//   const collection = await getEntryCollection(year, month);
//   let list = await collection.find().toArray();
//   return list;
// }
async function getAllEntries(year, month, day = null) {
  const collection = await getEntryCollection(year, month);
  let filter = {};
  if (day !== null) {
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${formattedDay}`;
    filter.date = dateStr;
  }
  let list = await collection.find(filter).toArray();
  return list;
}


async function getEntryById(id, year, month) {
  const collection = await getEntryCollection(year, month);
  let objectIdToQuery;
  try {
    objectIdToQuery = ObjectId.createFromHexString(id);
  } catch (e) {
    return null;
  }
  const entryObj = await collection.findOne({ _id: objectIdToQuery });
  return entryObj;
}

async function addEntry(obj, year, month) {
  const collection = await getEntryCollection(year, month);

  for (let key of Object.keys(obj)) {
    if (typeof obj[key] === "string") {
      obj[key] = normalizeNewlines(obj[key]);
    }
  }

  if (obj.date instanceof Date) {
    obj.date = obj.date.toISOString().split('T')[0];
  } else if (typeof obj.date === 'string' && obj.date.includes('T')) {
    obj.date = obj.date.split('T')[0];
  }

  const existingEntry = await collection.findOne({
    userId: obj.userId,
    date: obj.date
  });

  if (existingEntry) {
    const updateResult = await collection.findOneAndUpdate(
      { _id: existingEntry._id },
      { $set: { ...obj, updateDate: new Date() } },
      { returnDocument: 'after' }
    );
    return updateResult.value;
  } else {
    obj.addDate = new Date();
    obj.updateDate = new Date();
    let result = await collection.insertOne(obj);
    obj._id = result.insertedId;
    return obj;
  }
}

async function bulkAddOrUpdateEntries(entries, year, month) {
  const collection = await getEntryCollection(year, month);
  const operations = [];

  for (const entry of entries) {
    const processedEntry = { ...entry };

    for (let key of Object.keys(processedEntry)) {
      if (typeof processedEntry[key] === "string") {
        processedEntry[key] = normalizeNewlines(processedEntry[key]);
      }
    }

    if (processedEntry.date instanceof Date) {
      processedEntry.date = processedEntry.date.toISOString().split('T')[0];
    } else if (typeof processedEntry.date === 'string' && processedEntry.date.includes('T')) {
      processedEntry.date = processedEntry.date.split('T')[0];
    }

    const fieldsToSet = { ...processedEntry };
    delete fieldsToSet._id;

    operations.push({
      updateOne: {
        filter: { userId: processedEntry.userId, date: processedEntry.date },
        update: {
          $set: { ...fieldsToSet, updateDate: new Date() },
          $setOnInsert: { addDate: new Date() }
        },
        upsert: true
      }
    });
  }

  if (operations.length > 0) {
    try {
      const bulkResult = await collection.bulkWrite(operations);
      return {
        acknowledged: bulkResult.acknowledged,
        insertedCount: bulkResult.upsertedCount,
        matchedCount: bulkResult.matchedCount,
        modifiedCount: bulkResult.modifiedCount
      };
    } catch (bulkError) {
      throw bulkError;
    }
  }
  return { acknowledged: true, insertedCount: 0, matchedCount: 0, modifiedCount: 0 };
}

async function updateManyEntries(entries, year, month) {
  const collection = await getEntryCollection(year, month);
  const operations = entries.map((entry) => {
    const { _id, ...fieldsToUpdate } = entry;

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
  const updatedIds = entries.map((e) => ObjectId.createFromHexString(e._id));
  const updatedDocs = await collection.find({ _id: { $in: updatedIds } }).toArray();
  return updatedDocs;
}

async function updateEntry(entryId, fieldsToUpdate, year, month) {
  const collection = await getEntryCollection(year, month);

  fieldsToUpdate.updateDate = new Date();

  if (fieldsToUpdate.date instanceof Date) {
    fieldsToUpdate.date = fieldsToUpdate.date.toISOString().split('T')[0];
  } else if (typeof fieldsToUpdate.date === 'string' && fieldsToUpdate.date.includes('T')) {
    fieldsToUpdate.date = fieldsToUpdate.date.split('T')[0];
  }

  let objectIdToQuery;
  try {
    objectIdToQuery = ObjectId.createFromHexString(entryId);
  } catch (e) {
    return null;
  }

  let updatedDocument = null;
  try {
    const updateOperationResult = await collection.findOneAndUpdate(
      { _id: objectIdToQuery },
      { $set: fieldsToUpdate },
      { returnDocument: 'after' }
    );

    updatedDocument = updateOperationResult ? updateOperationResult.value : null;

  } catch (updateError) {
    return null;
  }

  if (!updatedDocument) {
    return null;
  }

  return updatedDocument;
}

async function deleteEntry(id, year, month) {
  const collection = await getEntryCollection(year, month);
  let objectIdToDelete;
  try {
    objectIdToDelete = ObjectId.createFromHexString(id);
  } catch (e) {
    return { deletedCount: 0 };
  }
  let result = await collection.deleteOne({ _id: objectIdToDelete });
  return result;
}

module.exports = EntryService = {
  getAllEntries,
  getEntryById,
  addEntry,
  bulkAddOrUpdateEntries,
  updateManyEntries,
  updateEntry,
  deleteEntry,
};
