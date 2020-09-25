const mongoose = require("mongoose");
const validator = require("validator");

const customerSchema = new mongoose.Schema({
  ListID: String,
  Name: String,
  EditSequence: String,
  FullName: {
    type: String,
    required: [true, "name is required"],
    unique: true,
    trim: true,
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
    Addr1: {
      type: String,
      default: "",
    },
    Addr2: String,
    City: String,
    State: String,
    PostalCode: {
      type: String,
      minLength: [5, "PostalCode/Zip must have atleast 5 characters"],
      maxlength: [6, "PostalCode/Zip must have atleast 6 characters"],
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
  QBRequest: String,
  Synced: Boolean,
  Hidden: Boolean,
});

const Customer = mongoose.model("Customer", customerSchema);
module.exports = Customer;
