const express = require("express");
const workOrderController = require("../controllers/workOrderController");
const router = express.Router();

router.route("/all").get(workOrderController.getAllWorkOrders);
router.route("/:id").get(workOrderController.getOneWorkOrder);
router.route("/complete").post(workOrderController.completeWorkOrder);

router.route("/add").post(workOrderController.addWorkOrder);
router.route("/edit").post(workOrderController.editWorkOrder);
//router.route("/delete").post(workOrderController.deleteWorkOrder);

module.exports = router;
