const mongoose = require("mongoose");

const EntrySchema = new mongoose.Schema({
    userId: mongoose.Types.ObjectId,
    name: String,
    daily_qty: Number,
    delivered_qty: Number,
    entry_status: String,
    date: Date,
    addDate: { type: Date, default: Date.now },
    updateDate: { type: Date, default: Date.now },
  });
  

module.exports = mongoose.model("Entry", EntrySchema);
