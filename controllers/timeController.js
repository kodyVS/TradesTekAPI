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

//Time in function
exports.timeIn = catchAsync(async (req, res, next) => {
 
  let timeData = { ...req.body };
 //! This code will be removed
  // Qbxml = convert("QBXML", {
  //   QBXMLMsgsRq: {
  //     _attr: { onError: "stopOnError" },
  //     },
  //   },
  // });

  //adding request to the Model and creating a new Job in Mongo
  //timeData.QBRequest = Qbxml;
  
  let doc;
  
  //todo Reduce to a single find and save function
  //Find an employee and find if the employee already timed in
  await Employee.findById(timeData.EmployeeReference).then(async (response) => {
    if (response.TimedIn) {
      doc = "User is already timed in";
    } else {

      //create a time model with the time data
      doc = await TimeModel.create(timeData).then(async (response) => {
        
        //After the time model is created store as a reference on the employee
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

//Function for timing out
exports.timeOut = catchAsync(async (req, res, next) => {
  let timeReference;
  let timeData = { ...req.body };
  let WOReference = timeData.WOReference;
  let doc;
  let timeIn;
  let timeOut = timeData.TimeData;
  let quantity;
  //find an employee and check if the employee is timed in
  await Employee.findById(timeData.EmployeeReference).then(async (employee) => {
    
    //todo Error handle
    //If user is not timed in, send a message 
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
        //set the data to be stored on the timeStamp
        timeStamp.TimeData.push(timeOut);
        console.log(quantity);
        timeStamp.Quantity = quantity;
        timeStamp.Desc = timeData.Desc;
        timeStamp.save();
      });

      //Store the time reference on the work order, and add the time to the total time on the request
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
