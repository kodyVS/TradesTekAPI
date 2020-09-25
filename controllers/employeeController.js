const catchAsync = require("../utils/catchAsync");
const factory = require("./factoryHandler");
const Job = require("../models/jobModel");
const Employee = require("../models/employeeModel");
const QbxmlModel = require("../models/QbxmlModel");
const AppError = require("../utils/appError");
const data2xml = require("data2xml");

exports.getAllEmployees = catchAsync(async (req, res, next) => {
  let data = await Employee.find({}).populate("WOReference");
  data = data.map((employee) => {
    return {
      Name: employee.Name,
      Id: employee._id,
      Phone: employee.Phone,
      Email: employee.Email,
      FieldType: employee.FieldType,
      _id: employee._id,
      TimedIn: employee.TimedIn,
      WOReference: employee.WOReference,
    };
  });
  res.status(200).json({
    status: "success",
    data,
  });
  next();
});

exports.getOneEmployee = catchAsync(async (req, res, next) => {
  let employee = await Employee.findById(req.params.id);
  if (!employee) {
    return next(new AppError("No employee found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    employee,
  });
  next();
});

exports.editEmployee = catchAsync(async (req, res, next) => {
  let newInfo = req.body;
  let employee = await Employee.findByIdAndUpdate(req.params.id, newInfo, {
    new: true,
  });
  if (!employee) {
    return next(new AppError("No employee found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    employee,
  });
  next();
});

exports.addJob = catchAsync(async (req, res, next) => {
  let JobName = req.body.JobName;
  let employee = await Employee.findByIdAndUpdate(
    req.params.id,
    {
      $addToSet: { Jobs: JobName },
    },
    { new: true }
  );
  if (!employee) {
    return next(new AppError("No employee found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      Name: employee.Name,
      Id: employee._id,
      Jobs: employee.Jobs,
    },
  });
  next();
});

exports.removeJob = catchAsync(async (req, res, next) => {
  let JobName = req.body.JobName;
  let employee = await Employee.findByIdAndUpdate(
    req.params.id,
    {
      $pull: { Jobs: JobName },
    },
    { new: true }
  );
  if (!employee) {
    return next(new AppError("No employee found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      Name: employee.Name,
      Id: employee._id,
      Jobs: employee.Jobs,
    },
  });
  next();
});
