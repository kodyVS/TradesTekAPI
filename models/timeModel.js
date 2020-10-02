const mongoose = require("mongoose");
const validator = require("validator");

const timeSchema = new mongoose.Schema({
  TxnLineID: String,
  WorkOrder: String,
  PONumber: Number,
  WOReference: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder" },
  Employee: String,
  EmployeeReference: { type: mongoose.Schema.Types.ObjectId, ref: "Employees" },
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
