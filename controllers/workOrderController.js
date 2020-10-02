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
  let InvoiceLineAdd = [];
  let totalTime = 0;
  await WorkOrder.findById(workOrder.WorkOrderID)
    .populate("TimeReference")
    .populate("Job")
    .then(async (filledWO) => {
      if (filledWO.JobType === "Construction") {
        filledWO.TimeReference.map((timeStamp) => {
          totalTime = totalTime + timeStamp.Quantity;
        });
        totalTime = Math.round((totalTime / 60 + Number.EPSILON) * 100) / 100;
        InvoiceLineAdd = {
          ItemRef: {
            ListID: "80000008-1597162251",
            FullName: "Hourly Rate",
          },
          Desc: filledWO.Name,
          Quantity: totalTime,
          ClassRef: { FullName: "Construction" },
          SalesTaxCodeRef: { ListID: "80000001-1597162222", FullName: "G" },
        };
      }
      // ? This is where I will add service requests
      if (filledWO.JobType === "Service") {
        filledWO.TimeReference.map((timeStamp) => {
          totalTime =
            Math.round((timeStamp.Quantity / 60 + Number.EPSILON) * 100) / 100;
          InvoiceLineAdd.push({
            ItemRef: {
              ListID: "80000008-1597162251",
              FullName: "Hourly Rate",
            },
            Desc: timeStamp.Desc,
            Quantity: totalTime,
            ClassRef: { FullName: "Service" },
            SalesTaxCodeRef: { ListID: "80000001-1597162222", FullName: "G" },
          });
        });
      }

      let qbxml;
      //Creating a request to store on the Model if there is a ListID on the request
      qbxml = convert("QBXML", {
        QBXMLMsgsRq: {
          _attr: { onError: "stopOnError" },
          InvoiceAddRq: {
            InvoiceAdd: {
              CustomerRef: {
                FullName: filledWO.Job.FullName,
              },
              ClassRef: {
                FullName: filledWO.JobType,
              },
              PONumber: filledWO.PONumber,
              InvoiceLineAdd: InvoiceLineAdd,
            },
          },
        },
      });
      //Store Request on the model
      (filledWO.QBRequest = qbxml), (filledWO.Synced = false), filledWO.save();
      //Send a Success message
      res.status(201).json({
        status: "success",
        data: "completed",
      });
      next();
    });
  // .catch((err) => {
  //   res.status(400).json({
  //     status: "error",
  //     data: err,
  //   });
  //   next();
  // });
});

//todo Remove the double data nest
exports.getOneWorkOrder = catchAsync(async (req, res, next) => {
  await WorkOrder.findById(req.params.id)
    .populate({
      path: "TimeReference",
      populate: {
        path: "EmployeeReference",
        select: "Name",
      },
    })
    .populate("Job")
    .then((doc) => {
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
});

//todo Should combine these functions and use params to get workOrders
exports.getAllWorkOrders = catchAsync(async (req, res, next) => {
  await WorkOrder.find({})
    .select("-TimeReference")
    .sort({ PONumber: -1 })
    .populate("Job")
    .then((data) => {
      res.status(200).json({
        status: "success",
        data,
      });
      next();
    });
});

exports.getAllActiveWorkOrders = catchAsync(async (req, res, next) => {
  await WorkOrder.find({ Complete: false })
    .select("-TimeReference")
    .sort({ PONumber: -1 })
    .populate("Job")
    .then((data) => {
      res.status(200).json({
        status: "success",
        data,
      });
      next();
    });
});
