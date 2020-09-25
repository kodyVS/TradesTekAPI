const catchAsync = require("../utils/catchAsync");
const factory = require("./factoryHandler");
const TimeModel = require("../models/timeModel");
const WorkOrder = require("../models/workOrderModel");
const Employee = require("../models/employeeModel");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");
const data2xml = require("data2xml");
const convert = data2xml({
  xmlHeader:
    '<?xml version="1.0" encoding="utf-8"?>\n<?qbxml version="13.0"?>\n',
});

exports.timeIn = catchAsync(async (req, res, next) => {
  //Creating Data Clones
  let newTime = { ...req.body };
  //todo Create a request to store on the Model
  // Qbxml = convert("QBXML", {
  //   QBXMLMsgsRq: {
  //     _attr: { onError: "stopOnError" },
  //     },
  //   },
  // });

  //adding request to the Model and creating a new Job in Mongo
  //newTime.QBRequest = Qbxml;
  let doc;
  await Employee.findById(newTime.EmployeeReference).then(async (response) => {
    if (response.TimedIn) {
      doc = "User is already timed in";
    } else {
      doc = await TimeModel.create(newTime).then(async (response) => {
        await Employee.findByIdAndUpdate(
          response.EmployeeReference,
          {
            TimedIn: true,
            TimeReference: response._id,
            WOReference: response.WOReference,
          },
          { new: true }
        );
      });
    }
  });
  res.status(201).json({
    status: "success",
    data: {
      doc,
    },
  });
  next();
});

exports.timeOut = catchAsync(async (req, res, next) => {
  let timeReference;
  let timeData = { ...req.body };
  let WOReference = timeData.WOReference;
  let doc;
  let timeIn;
  let timeOut = timeData.TimeData;
  let quantity;
  await Employee.findById(timeData.EmployeeReference).then(async (employee) => {
    //If user is not timed in turn that message
    if (!employee.TimedIn) {
      doc = "User is not timed in";
    } else {
      //set timeReference to the time reference held on the employee information
      timeReference = employee.TimeReference;
      employee.TimedIn = false;
      employee.TimeReference = "";
      employee.WOReference = null;
      employee.save();
      await TimeModel.findById(timeReference).then((timeStamp) => {
        timeIn = timeStamp.TimeData[0];

        //Total Hours work being stored on request
        date1 = new Date(timeIn);
        date2 = new Date(timeOut);
        let diff = (date2.getTime() - date1.getTime()) / 1000;
        diff /= 60;
        quantity = Math.abs(Math.round(diff));
        if (quantity === 0) {
          quantity = 1;
        }

        //todo Make the timeout request automatically only 24 hours max away from the time in.
        if (quantity > 24 * 60) {
          quantity = 24 * 60;
        }

        timeStamp.TimeData.push(timeOut);
        console.log(quantity);
        timeStamp.Quantity = quantity;
        timeStamp.Desc = timeData.Desc;
        timeStamp.save();
      });
      await WorkOrder.findByIdAndUpdate(
        WOReference,
        {
          $inc: { TotalMinutes: quantity },
          $push: { TimeReference: timeReference },
        },
        { new: true }
      );
    }
  });

  res.status(201).json({
    status: "success",
    data: {
      doc,
    },
  });
  next();
});

exports.timeEdit = catchAsync(async (req, res, next) => {
  timeData = { ...req.body };
  console.log(timeData.Desc);
});
//Returning data to Front-End
