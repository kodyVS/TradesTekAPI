const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  ListID: String,
  Name: {
    type: String,
    required: [true, "name is required"],
    unique: true,
    trim: true,
  },
  FirstName: String,
  LastName: String,
  ActiveStatus: Boolean,
  EditSequence: String,
  JobTitle: String,
  Phone: String,
  Mobile: String,
  Email: String,
  EmployeePosition: {
    type: String,
    enum: ["Field", "Office"],
    default: "Field",
  },
  FieldType: {
    type: String,
    enum: ["Plumber", "HVAC", "Laborer"],
    default: "Plumber",
  },
  Jobs: [],
  TimedIn: Boolean,
  TimeReference: "String",
  WOReference: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder" },
});

//! Change Employees to Employee
const Employee = mongoose.model("Employees", employeeSchema);
module.exports = Employee;
