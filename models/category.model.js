const mongoose = require("mongoose");
let areaSchema = new mongoose.Schema(
  {
    name: String,
    image: String,
  },
  { timestamps: true }
);
const Area = mongoose.model("Area", areaSchema);

module.exports = Area;
