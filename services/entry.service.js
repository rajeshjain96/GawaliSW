const { app } = require("../init.js");
const { ObjectId } = require("mongodb");
const { normalizeNewlines } = require("./utilities/lib");

async function getMetadataCollection() {
    const db = app.locals.db;
    return db.collection('app_metadata');
}

async function getLatestEntryDateFromMetadata() {
    const collection = await getMetadataCollection();
    const metadata = await collection.findOne({ _id: new ObjectId('68691372fa624c1dff2e06be') });
    return metadata ? metadata.last_entry_date : null;
}

async function updateLatestEntryDate(newDate) {
    const collection = await getMetadataCollection();
    const updateDate = newDate ? new Date(newDate) : null;
    if (!updateDate) {
        await reCalculateLatestDate();
        return;
    }
    const currentMetadata = await collection.findOne({ _id: new ObjectId('68691372fa624c1dff2e06be') });
    if (!currentMetadata || !currentMetadata.last_entry_date || new Date(updateDate) > new Date(currentMetadata.last_entry_date)) {
        await collection.updateOne(
            { _id: new ObjectId('68691372fa624c1dff2e06be') },
            { $set: { last_entry_date: updateDate } },
            { upsert: true }
        );
    }
}

async function reCalculateLatestDate() {
    const db = app.locals.db;
    const allCollections = await db.listCollections({}, { nameOnly: true }).toArray();
    const entryCollections = allCollections.map(c => c.name).filter(name => name.startsWith("entries_"));
    let latestOverallDate = null;
    for (const collectionName of entryCollections) {
        const collection = db.collection(collectionName);
        const latestInCollection = await collection.findOne({}, {
            sort: { date: -1, updateDate: -1 }
        });
        if (latestInCollection && (!latestOverallDate || new Date(latestInCollection.date) > new Date(latestOverallDate))) {
            latestOverallDate = latestInCollection.date;
        }
    }
    const metadataCollection = await getMetadataCollection();
    await metadataCollection.updateOne(
        { _id: new ObjectId('68691372fa624c1dff2e06be') },
        { $set: { last_entry_date: latestOverallDate ? new Date(latestOverallDate) : null } },
        { upsert: true }
    );
}

function getCollectionName(year, month) {
    const formattedMonth = String(month).padStart(2, '0');
    return `entries_${year}_${formattedMonth}`;
}

async function getEntryCollection(year, month) {
    const db = app.locals.db;
    const collectionName = getCollectionName(year, month);
    return db.collection(collectionName);
}

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

    let resultObj;
    if (existingEntry) {
        const updateResult = await collection.findOneAndUpdate(
            { _id: existingEntry._id },
            { $set: { ...obj, updateDate: new Date() } },
            { returnDocument: 'after' }
        );
        resultObj = updateResult.value;
    } else {
        obj.addDate = new Date();
        obj.updateDate = new Date();
        let result = await collection.insertOne(obj);
        obj._id = result.insertedId;
        resultObj = obj;
    }
    
    if (resultObj) {
        await updateLatestEntryDate(resultObj.date);
    }
    
    return resultObj;
}

async function bulkAddOrUpdateEntries(entries, year, month) {
    const collection = await getEntryCollection(year, month);
    const operations = [];

    let latestDateInBulk = null;

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
        
        if (!latestDateInBulk || new Date(processedEntry.date) > new Date(latestDateInBulk)) {
            latestDateInBulk = processedEntry.date;
        }

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
            await updateLatestEntryDate(latestDateInBulk);
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
    await updateLatestEntryDate(new Date().toISOString());
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
    if (updatedDocument) {
        await updateLatestEntryDate(updatedDocument.date);
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
    if (result.deletedCount > 0) {
        await reCalculateLatestDate();
    }
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
  getLatestEntryDateFromMetadata,
};