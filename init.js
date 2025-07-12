const express = require("express");
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv").config();
// const mongodb = require("mongodb");
// const url = "mongodb://127.0.0.1:27017";
const client = new MongoClient(process.env.MONGODB_URL);
const dbName = "milkdbnew";

let db;
const app = express();

connectToDatabase();
async function connectToDatabase() {
  try {
    await client.connect();
    db = client.db(dbName);
    app.locals.db = db;
    console.log("Database connected...");
    app.listen(3000, () => {
      console.log("Server started at port number 3000.. .");
    });
  } catch (err) {
    
    console.log(err);
  }
}

module.exports = { app };
