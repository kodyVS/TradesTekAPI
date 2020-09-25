const catchAsync = require("../utils/catchAsync");
const factory = require("./factoryHandler");
const Customer = require("../models/customerModel");
const AppError = require("../utils/appError");
const data2xml = require("data2xml");
const convert = data2xml({
  xmlHeader:
    '<?xml version="1.0" encoding="utf-8"?>\n<?qbxml version="13.0"?>\n',
});

//Controllers

exports.addCustomer = catchAsync(async (req, res, next) => {
  //Creating Data Clones
  let mongoNewCustomer = { ...req.body };
  let quickbooksNewCustomer = { ...req.body };
  delete quickbooksNewCustomer.FullName;
  delete quickbooksNewCustomer.Synced;

  //Creating a request to store on the Model
  Qbxml = convert("QBXML", {
    QBXMLMsgsRq: {
      _attr: { onError: "stopOnError" },
      CustomerAddRq: {
        CustomerAdd: quickbooksNewCustomer,
      },
    },
  });
  //adding request to the Model and creating a new customer in Mongo
  mongoNewCustomer.QBRequest = Qbxml;
  const doc = await Customer.create(mongoNewCustomer);
  //Returning data to front-end
  res.status(201).json({
    status: "success",
    data: {
      doc,
    },
  });
  next();
});

//Edit Customers
exports.editCustomer = catchAsync(async (req, res, next) => {
  let editedCustomer = { ...req.body };

  //Update Model with new info
  await Customer.findOneAndUpdate(
    { FullName: editedCustomer.FullName },
    editedCustomer,
    {
      new: true,
    }
  );
  //Format JSON to be added to quickbooks and converted into qbxml
  let QBEditRequest = { ...req.body };
  delete QBEditRequest.Synced;
  delete QBEditRequest.FullName;
  let qbxml;
  //Creating a request to store on the Model if there is a ListID on the request if not create a customer
  //This allows for editting a customer that hasn't been synced with quickbooks yet.
  if (!req.body.ListID) {
    qbxml = convert("QBXML", {
      QBXMLMsgsRq: {
        _attr: { onError: "stopOnError" },
        CustomerAddRq: {
          CustomerAdd: QBEditRequest,
        },
      },
    });
  } else {
    qbxml = convert("QBXML", {
      QBXMLMsgsRq: {
        _attr: { onError: "stopOnError" },
        CustomerModRq: {
          CustomerMod: QBEditRequest,
        },
      },
    });
  }
  //Store Request on the model
  let doc = await Customer.findOneAndUpdate(
    { FullName: editedCustomer.FullName },
    {
      QBRequest: qbxml,
      Synced: false,
    },
    {
      new: true,
    }
  );
  //adding request to the Model and creating a new customer in Mongo

  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }

  res.status(201).json({
    status: "success",
    data: {
      data: "Customer successfully changed",
    },
  });
  next();
});

//Delete customer changes the hidden status to true (currently not being used)
exports.deleteCustomer = catchAsync(async (req, res, next) => {
  await Customer.findOneAndUpdate(
    { FullName: req.body.FullName },
    { Hidden: true },
    { new: true }
  );
  res.status(204).json({
    status: "success",
    data: {},
  });
  next();
});

exports.getAllCustomers = catchAsync(async (req, res, next) => {
  let data = await Customer.find();
  res.status(200).json({
    status: "success",
    data,
  });
  next();
});

exports.getOneCustomer = catchAsync(async (req, res, next) => {
  let doc = await Customer.findById(req.params.id);

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
