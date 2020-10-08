const mongoose = require("mongoose");
const validator = require("validator");

const workOrderSchema = new mongoose.Schema({
  Name: String,
  Job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
  Description: String,
  JobType: {
    type: String,
  },
  Complete: {
    type: Boolean,
    default: false,
  },
  Employees: {
    type: Array,
  },
  QBRequest: String,
  Synced: {
    type: Boolean,
    default: true,
  },
  Hidden: Boolean,
  PONumber: {
    type: Number,
    required: true,
    unique: true,
  },
  TotalMinutes: Number,

  //Quickbooks data
  TxnID: String,
  TimeCreated: String,
  EditSequence: String,
  TxtNumber: Number,
  CustomerRef: {
    ListID: String,
    FullName: String,
  },
  //I store all the time references on this model
  TimeReference: [{ type: mongoose.Schema.Types.ObjectId, ref: "Time" }],
  //"ARAccountRef": {
  // ListID: String,
  //FullName: String
  //}
});

const WorkOrder = mongoose.model("WorkOrder", workOrderSchema);
module.exports = WorkOrder;
