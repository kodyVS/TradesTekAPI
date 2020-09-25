const express = require("express");
const employeeController = require("../controllers/employeeController");
const router = express.Router();

// /api/v1/employee

router.route("/all").get(employeeController.getAllEmployees);
router.route("/:id").get(employeeController.getOneEmployee);

router.route("/addJob/:id").patch(employeeController.addJob);
router.route("/removeJob/:id").patch(employeeController.removeJob);
module.exports = router;
