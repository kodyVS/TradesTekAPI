const catchAsync = require("../utils/catchAsync");
const factory = require("./factoryHandler");
const WorkOrder = require("../models/workOrderModel");
const Counter = require("../models/counterModel");
const AppError = require("../utils/appError");
const data2xml = require("data2xml");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const Time = require("../models/timeModel");
const convert = data2xml({
  xmlHeader:
    '<?xml version="1.0" encoding="utf-8"?>\n<?qbxml version="13.0"?>\n',
});

//todo Handle when work order is completed with quickbooks better !Important
//todo Add pictures to work works (hold the image URL in database)

exports.addWorkOrder = catchAsync(async (req, res, next) => {
  console.log(req.headers);
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

exports.deleteWorkOrder = catchAsync(async (req, res, next) => {
  let deletedWO = await WorkOrder.findById(req.body._id);
  if (deletedWO.TimeReference) {
    if (deletedWO.TimeReference.length > 0) {
      console.log("time data is present");
      console.log(deletedWO.TimeReference);
      return next(
        new AppError(
          "Could not delete. This work order has time attached to it.",
          400
        )
      );
    }
  }
  await WorkOrder.findByIdAndDelete(deletedWO._id);
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
  let token = req.headers.cookie.slice(4);
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  if (decoded.UserRole === "admin") {
    await WorkOrder.findById(workOrder.WorkOrderID)
      .populate("TimeReference")
      .populate("Job")
      .then(async (filledWO) => {
        //If the work order is labeled construction add the total time and create an invoice line based off title of work order
        if (filledWO.JobType === "Construction") {
          filledWO.TimeReference.map((timeStamp) => {
            if (timeStamp.Complete === false) {
              totalTime = totalTime + timeStamp.Quantity;
            }
          });

          if (totalTime === 0) {
            return new AppError(
              "No time has been added to this work order",
              400
            );
          }
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
            if (timeStamp.Complete === false) {
              totalTime =
                Math.round((timeStamp.Quantity / 60 + Number.EPSILON) * 100) /
                100;
              InvoiceLineAdd.push({
                ItemRef: {
                  ListID: "80000008-1597162251",
                  FullName: "Hourly Rate",
                },
                Desc: timeStamp.Desc,
                Quantity: totalTime,
                ClassRef: { FullName: "Service" },
                SalesTaxCodeRef: {
                  ListID: "80000001-1597162222",
                  FullName: "G",
                },
              });
            }
            if (InvoiceLineAdd.length === 0) {
              return new AppError(
                "No time data entered for this work order, work orders must have time before completed",
                400
              );
            }
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
  } else if (decoded.UserRole === "user") {
    console.log("hello");
    await WorkOrder.findByIdAndUpdate(
      workOrder.WorkOrderID,
      {
        IsPending: true,
      },
      { new: true }
    )
      .then(() => {
        res.status(201).json({
          status: "success",
          data: "completed",
        });
      })
      .catch((error) => {
        return new AppError(error, 400);
      });
  }
  //Find the work order by ID and populate the times and the job data
});

//Get One Work Order
exports.getOneWorkOrder = catchAsync(async (req, res, next) => {
  //find by id and populate all the data associated with the work order
  let populateFilter = "";
  if (req.query.TimePopulation === "true") {
    populateFilter = {
      path: "TimeReference",
      populate: {
        path: "EmployeeReference",
        select: "Name",
      },
    };
  }
  let query = WorkOrder.findById(req.params.id)
    .populate(populateFilter)
    .populate("Job");
  let doc = await query;
  if (!doc) {
    return next(new AppError("No Work Order found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: doc,
  });
});

//todo Combine these functions and use params to get workOrders
exports.getAllWorkOrders = catchAsync(async (req, res, next) => {
  let searchFilter = { Complete: false };
  await WorkOrder.find()
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
  let rangeFilter1;
  let rangeFilter2;
  let searchFilter = { Complete: false };
  if (req.query.Name) {
    searchFilter.Employees = req.query.Name;
  }
  if (req.query.LowRange) {
    let lowRange = req.query.LowRange;
    let highRange = req.query.HighRange;
    (searchFilter.$or = [
      { StartDate: { $gte: lowRange } },
      { EndDate: { $gte: highRange } },
    ]),
      (searchFilter.StartDate = {
        $lte: highRange,
      });
  }
  await WorkOrder.find(searchFilter)
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
