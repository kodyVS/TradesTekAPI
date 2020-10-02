const express = require("express");
const timeController = require("../controllers/timeController");
const router = express.Router();

// /api/v1/time
router.route("/all").get(timeController.getAllTimes);
// router.route("/:id").get(timeController.getOneTime);

router.route("/timeIn").post(timeController.timeIn);
router.route("/timeOut").post(timeController.timeOut);
router.route("/delete/:id").delete(timeController.deleteTime);
router.route("/edit").patch(timeController.editTime);
router.route("/add").post(timeController.addTime);
module.exports = router;
