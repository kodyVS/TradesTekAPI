const catchAsync = require("../utils/catchAsync");
const factory = require("./factoryHandler");
const Job = require("../models/jobModel");
const Counter = require("../models/counterModel");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");
const data2xml = require("data2xml");
const convert = data2xml({
  xmlHeader:
    '<?xml version="1.0" encoding="utf-8"?>\n<?qbxml version="13.0"?>\n',
});

exports.addJob = catchAsync(async (req, res, next) => {
  //Creating Data Clones
  let newJob = { ...req.body };

  //Creating a request to store on the Model
  Qbxml = convert("QBXML", {
    QBXMLMsgsRq: {
      _attr: { onError: "stopOnError" },
      CustomerAddRq: {
        CustomerAdd: {
          Name: newJob.Name,
          ParentRef: newJob.ParentRef,
          FirstName: newJob.FirstName,
          LastName: newJob.LastName,
          BillAddress: newJob.BillAddress,
          Phone: newJob.Phone,
          Email: newJob.Email,
        },
      },
    },
  });
  //adding request to the Model and creating a new Job in Mongo
  newJob.QBRequest = Qbxml;
  const doc = await Job.create(newJob);
  //Returning data to Front-End
  res.status(201).json({
    status: "success",
    data: {
      doc,
    },
  });
  next();
});

exports.editJob = catchAsync(async (req, res, next) => {
  let editedJob = { ...req.body };

  //Update Model with new info
  await Job.findOneAndUpdate({ FullName: editedJob.FullName }, editedJob, {
    new: true,
  });
  //Format xml
  let qbxml;
  //Creating a request to store on the Model if there is a ListID on the request
  if (!req.body.ListID) {
    qbxml = convert("QBXML", {
      QBXMLMsgsRq: {
        _attr: { onError: "stopOnError" },
        CustomerAddRq: {
          CustomerAdd: {
            Name: newJob.Name,
            ParentRef: newJob.ParentRef,
            FirstName: newJob.FirstName,
            LastName: newJob.LastName,
            BillAddress: newJob.BillAddress,
            Phone: newJob.Phone,
            Email: newJob.Email,
          },
        },
      },
    });
  } else {
    qbxml = convert("QBXML", {
      QBXMLMsgsRq: {
        _attr: { onError: "stopOnError" },
        CustomerModRq: {
          CustomerMod: {
            ListID: editedJob.ListID,
            EditSequence: editedJob.EditSequence,
            Name: editedJob.Name,
            ParentRef: editedJob.ParentRef,
            FirstName: editedJob.FirstName,
            LastName: editedJob.LastName,
            BillAddress: editedJob.BillAddress,
            Phone: editedJob.Phone,
            Email: editedJob.Email,
          },
        },
      },
    });
  }
  //Store Request on the model
  let doc = await Job.findOneAndUpdate(
    { FullName: editedJob.FullName },
    {
      QBRequest: qbxml,
      Synced: false,
    },
    {
      new: true,
    }
  );
  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }
  res.status(201).json({
    status: "success",
    data: {
      data: "Job successfully edited",
    },
  });
  next();
});

exports.deleteJob = catchAsync(async (req, res, next) => {
  await Job.findOneAndUpdate(
    { FullName: req.body.FullName },
    { Hidden: true },
    { new: true }
  );
  res.status(204).json({
    status: "success",
    data: { status: "Hidden" },
  });
  next();
});

exports.getAllJobs = catchAsync(async (req, res, next) => {
  await Job.find({})
    .sort({ "ParentRef.FullName": 1 })
    .then((data) => {
      res.status(200).json({
        status: "success",
        data,
      });
      next();
    });
});

exports.getOneJob = catchAsync(async (req, res, next) => {
  let doc = await Job.findById(req.params.id);

  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});
