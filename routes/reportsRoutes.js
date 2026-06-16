const express = require("express");
const {  getMembershipsReport, getMembershipsByDateReport, getAttendanceReport , getattendanceByDateReport, getClientReport } = require("../controllers/reportController");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

// Every reporting route is staff-only.
router.use(requireRole(["employee", "admin"]));

router.get("/membershipsReport", getMembershipsReport);

router.post("/membershipsBayDateReport", getMembershipsByDateReport);

router.get("/attendancesReport", getAttendanceReport);

router.post("/attendancesByDateReport", getattendanceByDateReport);

router.get("/clientReport/:ci", getClientReport);

module.exports = router;
