const catchAsync = require("../utils/catchAsync");
const factory = require("./factoryHandler");
const WorkOrder = require("../models/workOrderModel");
const Counter = require("../models/counterModel");
const AppError = require("../utils/appError");
const data2xml = require("data2xml");
const Time = require("../models/timeModel");
const convert = data2xml({
  xmlHeader:
    '<?xml version="1.0" encoding="utf-8"?>\n<?qbxml version="13.0"?>\n',
});

//todo Handle when work order is completed with quickbooks better !Important
//todo Add pictures to work works (hold the image URL in database)

exports.addWorkOrder = catchAsync(async (req, res, next) => {
  let PONumber;
  let newWorkOrder = { ...req.body };

  //Creating the PO Number and increase the count by one.
  await Counter.findByIdAndUpdate(
    { _id: "5f650840a2ae1d521cdb1a42" },
    { $inc: { Count: 1 } },
    { new: true }
  ).then((result) => {
    PONumber = result.Count;
  });

  newWorkOrder.PONumber = PONumber;

  const doc = await WorkOrder.create(newWorkOrder);

  //Returning data to Front-End with created status code
  //todo could remove the returning of the data. but nice to have for front-end debugging
  res.status(201).json({
    status: "success",
    data: {
      doc,
    },
  });
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
});

// Not using this yet
// todo Create the deletion methods
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
});

// Complete a work order and send time data to quickbooks and create invoice data
//todo Add functionailty for work orders that are completed, then marked incomplete again later
//todo In the map functions add the statement (if timestamp.Complete === false)
exports.completeWorkOrder = catchAsync(async (req, res, next) => {
  let workOrder = req.body;
  let InvoiceLineAdd = [];
  let totalTime = 0;

  //Find the work order by ID and populate the times and the job data
  await WorkOrder.findById(workOrder.WorkOrderID)
    .populate("TimeReference")
    .populate("Job")
    .then(async (filledWO) => {
      //If the work order is labeled construction add the total time and create an invoice line based off title of work order
      if (filledWO.JobType === "Construction") {
        filledWO.TimeReference.map((timeStamp) => {
          totalTime = totalTime + timeStamp.Quantity;
        });
        totalTime = Math.round((totalTime / 60 + Number.EPSILON) * 100) / 100;
        //reference to the quickbooks payment lines
        //todo be able to pull this itemRef from quickbooks and automatically populate it here
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
      //if the job is a service call, add every time individually to the invoice with the description on the time
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
      //Mark all the time data as completed/billed so after we sync to quickbooks they won't be found again
      await Time.updateMany(
        { WOReference: filledWO._id },
        { Completed: true }
      ).then(() => {});

      //Store Request on the model
      filledWO.QBRequest = qbxml;
      filledWO.Synced = false;
      filledWO.save();
      //Send a Success message

      res.status(201).json({
        status: "success",
        data: "completed",
      });
    });
});

//Get One Work Order
exports.getOneWorkOrder = catchAsync(async (req, res, next) => {
  //find by id and populate all the data associated with the work order
  let query = WorkOrder.findById(req.params.id)
    .populate({
      path: "TimeReference",
      populate: {
        path: "EmployeeReference",
        select: "Name",
      },
    })
    .populate("Job");
  let doc = await query;
  if (!doc) {
    return next(new AppError("No Work Order found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});

//todo Combine these functions and use params to get workOrders
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
    });
});
