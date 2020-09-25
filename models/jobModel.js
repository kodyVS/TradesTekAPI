const mongoose = require("mongoose");
const validator = require("validator");

const jobSchema = new mongoose.Schema({
  ListID: String,
  Name: String,
  EditSequence: String,
  FullName: {
    type: String,
    unique: true,
    trim: true,
  },
  ParentRef: {
    ListID: String,
    FullName: String,
  },
  Salutation: {
    type: String,
    default: "Mr",
  },
  FirstName: {
    type: String,
    required: false,
  },
  MiddleName: String,
  LastName: String,
  JobTitle: String,
  BillAddress: {
    Addr1: String,
    Addr2: String,
    City: String,
    State: String,
    PostalCode: {
      type: String,
    },
    Country: String,
  },
  Note: String,
  Phone: String,
  AltPhone: String,
  Fax: String,
  Email: {
    type: String,
    validate: [validator.isEmail, "Please provide a valid email"],
  },
  Synced: Boolean,
  QBRequest: String,
});

const Job = mongoose.model("Job", jobSchema);
module.exports = Job;
