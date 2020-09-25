const catchAsync = require("../utils/catchAsync");
const factory = require("./factoryHandler");
const WorkOrder = require("../models/workOrderModel");
const Counter = require("../models/counterModel");
const AppError = require("../utils/appError");
const data2xml = require("data2xml");
const convert = data2xml({
  xmlHeader:
    '<?xml version="1.0" encoding="utf-8"?>\n<?qbxml version="13.0"?>\n',
});

exports.addWorkOrder = catchAsync(async (req, res, next) => {
  //todo Create PO numbers when added
  let PONumber;
  let newWorkOrder = { ...req.body };

  //Creating the PO Number
  await Counter.findByIdAndUpdate(
    { _id: "5f650840a2ae1d521cdb1a42" },
    { $inc: { Count: 1 } },
    { new: true }
  ).then((result) => {
    PONumber = result.Count;
  });

  newWorkOrder.PONumber = PONumber;

  // Qbxml = convert("QBXML", {
  //   QBXMLMsgsRq: {
  //     _attr: { onError: "stopOnError" },
  //     InvoiceAddRq: {
  //       InvoiceAdd: {
  //         CustomerRef: {
  //           FullName: newWorkOrder.JobName,
  //         },
  //         ClassRef: {
  //           FullName: newWorkOrder.JobType,
  //         },
  //         PONumber: newWorkOrder.PONumber,
  //         InvoiceLineAdd: {
  //           Desc: newWorkOrder.Name,
  //         },
  //       },
  //     },
  //   },
  // });

  // //adding request to the Model and creating a new WorkOrder in Mongo
  // newWorkOrder.QBRequest = Qbxml;
  const doc = await WorkOrder.create(newWorkOrder);
  //Returning data to Front-End
  res.status(201).json({
    status: "success",
    data: {
      doc,
    },
  });
  next();
});

exports.editWorkOrder = catchAsync(async (req, res, next) => {
  let editedWorkOrder = { ...req.body };

  //Update Model with new info
  await WorkOrder.findByIdAndUpdate(
    editedWorkOrder.WorkOrderId,
    editedWorkOrder,
    {
      new: true,
    }
  );
  //Format xml
  let qbxml;
  // //Creating a request to store on the Model if there is a ListID on the request
  // if (!req.body.ListID) {
  //   qbxml = convert("QBXML", {
  //     QBXMLMsgsRq: {
  //       _attr: { onError: "stopOnError" },

  //       //todo add work order quickbooks info
  //       //
  //     },
  //   });
  // } else {
  //   qbxml = convert("QBXML", {
  //     QBXMLMsgsRq: {
  //       _attr: { onError: "stopOnError" },

  //       //todo add work order quickbooks info
  //       //
  //     },
  //   });
  // }
  //Store Request on the model
  let doc = await WorkOrder.findOneAndUpdate(
    { FullName: editedWorkOrder.FullName },
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
      data: "WorkOrder successfully edited",
    },
  });
  next();
});

// Not using this yet
exports.deleteWorkOrder = catchAsync(async (req, res, next) => {
  await WorkOrder.findOneAndUpdate(
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

exports.completeWorkOrder = catchAsync(async (req, res, next) => {
  let workOrder = req.body;
  let ConstructionLineRet;
  await WorkOrder.findById(workOrder.WorkOrderID)
    .populate("TimeReference")
    .then((filledWO) => {
      if (filledWO.JobType === "Construction") {
        let totalTime = 0;
        filledWO.TimeReference.map((timeStamp) => {
          totalTime = totalTime + timeStamp.Quantity;
        });
      }

      //       let Qbxml;
      //     //Creating a request to store on the Model if there is a ListID on the request
      //        Qbxml = convert("QBXML", {
      //   QBXMLMsgsRq: {
      //     _attr: { onError: "stopOnError" },
      //     InvoiceAddRq: {
      //       InvoiceAdd: {
      //         CustomerRef: {
      //           FullName: filledWO.JobName,
      //         },
      //         ClassRef: {
      //           FullName: filledWO.JobType,
      //         },
      //         PONumber: filledWO.PONumber,
      //         InvoiceLineAdd: {

      //         },
      //       },
      //     },
      //   },
      // });
      //       //Store Request on the model
      //       let doc = await WorkOrder.findOneAndUpdate(
      //         { FullName: editedWorkOrder.FullName },
      //         {
      //           QBRequest: qbxml,
      //           Synced: false,
      //         },
      //         {
      //           new: true,
      //         }
      //     )
    });
  res.status(201).json({
    status: "success",
    data: "completed",
  });
  next();
});

//todo add filters to only get x amount of work orders or work orders after x date. Otherwise this will be a huge request
exports.getAllWorkOrders = catchAsync(async (req, res, next) => {
  await WorkOrder.find({})
    .select("-TimeReference")
    .populate("Job")
    .then((data) => {
      res.status(200).json({
        status: "success",
        data,
      });
      next();
    });
});

exports.getOneWorkOrder = catchAsync(async (req, res, next) => {
  let doc = await WorkOrder.findById(req.params.id);

  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }
  WorkOrder.set("CreateRequest", undefined, { strict: false });
  res.status(200).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});