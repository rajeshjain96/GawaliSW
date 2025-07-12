const mongoose = require("mongoose");
let areaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);
const Area = mongoose.model("Area", areaSchema);

module.exports = Area;
