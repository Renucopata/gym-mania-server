const express = require("express");
const { getAttendances, getAttendanceByCi, getTodayAttendances , addAttendance , deleteAttendance} = require("../controllers/attendanceController")
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

// Every attendance route is staff-only.
router.use(requireRole(["employee", "admin"]));

// GET all attendance list
router.get("/getAll", getAttendances);

// GET Todays attendances
router.get("/getTodays", getTodayAttendances)

// GET attendance by ci
router.get("/getByCi/:ci", getAttendanceByCi);

// POST a new attendance
router.post("/register", addAttendance);

// DELETE an attendance record
router.delete("/remove/:id", deleteAttendance);

module.exports = router;
