const mongoose = require("mongoose");
const validator = require("validator");

const timeSchema = new mongoose.Schema({
  TxnLineID: String,
  WOReference: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder" },
  EmployeeReference: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  TimeData: [],
  ItemRef: {
    ListID: String,
    FullName: String,
  },
  Desc: String,
  Quantity: Number,
  Synced: {
    type: Boolean,
    default: false,
  },
  ClassRef: {
    FullName: {
      type: String,
      enum: ["Construction", "Service"],
    },
  },
});
const Time = mongoose.model("Time", timeSchema);
module.exports = Time;
