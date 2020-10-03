const catchAsync = require("../utils/catchAsync");
const factory = require("./factoryHandler");
const TimeModel = require("../models/timeModel");
const WorkOrder = require("../models/workOrderModel");
const Employee = require("../models/employeeModel");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");
const data2xml = require("data2xml");
const Time = require("../models/timeModel");
const convert = data2xml({
  xmlHeader:
    '<?xml version="1.0" encoding="utf-8"?>\n<?qbxml version="13.0"?>\n',
});

//Time in function
exports.timeIn = catchAsync(async (req, res, next) => {
  let timeData = { ...req.body };

  let doc;

  //todo Reduce to a single find and save function
  //Find an employee and find if the employee already timed in
  await Employee.findById(timeData.EmployeeReference).then(async (response) => {
    if (response.TimedIn) {
      doc = "User is already timed in";
    } else {
      //create a time model with the time data
      timeData.TimeData = new Date(timeData.TimeData);
      doc = await TimeModel.create(timeData).then(async (response) => {
        //After the time model is created store as a reference on the employee
        await Employee.findByIdAndUpdate(
          response.EmployeeReference,
          {
            TimedIn: true,
            TimeReference: response._id,
            WOReference: response.WOReference,
            WorkOrder: response.WorkOrder,
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
        date1 = timeIn;
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
        timeStamp.TimeData.push(date2);
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

exports.editTime = catchAsync(async (req, res, next) => {
  let timeData = { ...req.body };
  timeData.TimeData[0] = new Date(timeData.TimeData[0]);
  timeData.TimeData[1] = new Date(timeData.TimeData[1]);
  let diff =
    (timeData.TimeData[0].getTime() - timeData.TimeData[1].getTime()) / 1000;
  diff /= 60;
  quantity = Math.abs(Math.round(diff));
  if (quantity <= 0) {
    quantity = 1;
  }
  timeData.Quantity = quantity;
  await Time.findByIdAndUpdate(timeData._id, timeData, { new: true }).then(
    () => {
      res.status(201).json({
        status: "success",
      });
    }
  );
});

exports.addTime = catchAsync(async (req, res, next) => {
  let newTime = { ...req.body };
  let quantity;
  newTime.TimeData[0] = new Date(newTime.TimeData[0]);
  newTime.TimeData[1] = new Date(newTime.TimeData[1]);

  //Total Hours work being stored on request
  let diff =
    (newTime.TimeData[0].getTime() - newTime.TimeData[1].getTime()) / 1000;
  diff /= 60;
  quantity = Math.abs(Math.round(diff));
  if (quantity === 0) {
    quantity = 1;
  }
  //todo Make the timeout request automatically only 24 hours max away from the time in.
  if (quantity > 24 * 60) {
    quantity = 24 * 60;
  }

  newTime.Quantity = quantity;
  console.log(newTime);
  await Time.create(newTime).then(async (doc) => {
    console.log(doc);
    await WorkOrder.findByIdAndUpdate(
      newTime.WOReference,
      {
        $inc: { TotalMinutes: quantity },
        $push: { TimeReference: doc._id },
      },
      { new: true }
    );
    res.status(201).json({
      status: "success",
      data: doc,
    });
  });

  next();
});

exports.deleteTime = catchAsync(async (req, res, next) => {
  console.log(req.params.id);
  await Time.findByIdAndDelete(req.params.id).then(() => {
    res.status(204).json({
      status: "success",
      data: { status: "Deleted" },
    });
  });

  next();
});

//Returning data to Front-End
exports.getAllTimes = catchAsync(async (req, res, next) => {
  console.log(req.query);
  let doc = await Time.find({
    Employee: req.query.filter,
    TimeData: {
      $gte: new Date(req.query.lowRange),
      $lte: new Date(req.query.highRange),
    },
  });
  res.status(201).json({
    status: "success",
    data: doc,
  });
  next();
});
