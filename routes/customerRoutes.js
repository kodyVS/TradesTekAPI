const express = require("express");
const customerController = require("../controllers/customerController");
const router = express.Router();

router.route("/all").get(customerController.getAllCustomers);
router.route("/:id").get(customerController.getOneCustomer);

router.route("/add").post(customerController.addCustomer);
router.route("/edit").post(customerController.editCustomer);
router.route("/delete").post(customerController.deleteCustomer);
module.exports = router;
