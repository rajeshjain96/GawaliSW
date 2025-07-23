const { app } = require("../init.js");
const { ObjectId } = require("mongodb");

async function getAllMilkRates() {
  const db = app.locals.db;
  const collection = db.collection("milkrates");
  let list = await collection.find().toArray();
  return list;
}

async function getMilkRateById(id) {
  const db = app.locals.db;
  const collection = db.collection("milkrates");
  const milkrateObj = await collection.findOne({
    _id: ObjectId.createFromHexString(id),
  });
  console.log(milkrateObj);
  return milkrateObj;
}

async function addMilkRate(obj) {
  const db = app.locals.db;
  const collection = db.collection("milkrates");
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

async function addManyMilkRates(milkrates) {
  const db = app.locals.db;
  const collection = db.collection("milkrates");
  const result = await collection.insertMany(milkrates);
  const insertedIds = Object.values(result.insertedIds);
  const insertedDocs = await collection
    .find({ _id: { $in: insertedIds } })
    .toArray();
  return insertedDocs;
}

async function updateManyMilkRates(milkrates) {
  const db = app.locals.db;
  const collection = db.collection("milkrates");
  const operations = milkrates.map((user) => {
    const { _id, ...fieldsToUpdate } = user;
    return {
      updateOne: {
        filter: { _id: ObjectId.createFromHexString(_id) },
        update: { $set: fieldsToUpdate },
      },
    };
  });
  const result = await collection.bulkWrite(operations);
  const updatedIds = milkrates.map((u) => ObjectId.createFromHexString(u._id));
  const updatedMilkRates = await collection
    .find({ _id: { $in: updatedIds } }) 
    .toArray();
  return updatedMilkRates;
}

async function updateMilkRate(obj) {
  const db = app.locals.db;
  const collection = db.collection("milkrates");
  let id = obj._id;
  delete obj._id;
  let result = await collection.updateOne(
    { _id: ObjectId.createFromHexString(id) },
    { $set: obj }
  );
  return result;
}

async function deleteMilkRate(id) {
  const db = app.locals.db;
  const collection = db.collection("milkrates");
  let obj = await collection.deleteOne({
    _id: ObjectId.createFromHexString(id),
  });
  return obj;
}

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, "\n");
}

async function upsertMilkRateByDate(milkRateData) {
  const db = app.locals.db;
  const collection = db.collection("milkrates");

  let fromDate;
  if (milkRateData.from) {
    fromDate = new Date(milkRateData.from);
    fromDate.setUTCHours(0, 0, 0, 0);
  } else {
    throw new Error("From date is required for upsert operation.");
  }

  const fieldsToSet = {
    rate: milkRateData.rate,
    from: fromDate,
    updateDate: new Date(),
  };

  const fieldsOnInsert = {
    addDate: new Date(),
  };


  const query = { from: fromDate };

  const options = {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true, 
  };

  try {
    const result = await collection.findOneAndUpdate(
      query,
      { $set: fieldsToSet, $setOnInsert: fieldsOnInsert },
      options
    );

    if (result && result.value) {
        const keys = Object.keys(result.value);
        for (let key of keys) {
            if (typeof result.value[key] === "string") {
                result.value[key] = normalizeNewlines(result.value[key]);
            }
        }
    }

    return result.value;
  } catch (error) {
    console.error("Error in upsertMilkRateByDate:", error);
    throw error;
  }
}

module.exports = MilkRateService = {
  getAllMilkRates,
  getMilkRateById,
  addMilkRate,
  addManyMilkRates,
  updateManyMilkRates,
  updateMilkRate,
  deleteMilkRate,
  upsertMilkRateByDate, 
};




