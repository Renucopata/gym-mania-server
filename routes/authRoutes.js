const express = require("express");
const { loginUser, registerUser, getEmployees, getOne, getShift, addShift, deleteShift, deleteEmployee, updateEmployeeStatus } = require("../controllers/authController");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

// Per-route gating (NOT router.use) so /login stays public while every
// staff-management endpoint is admin-only.
const adminOnly = requireRole(["admin"]);

router.get("/getEmployees", adminOnly, getEmployees);
router.get("/getOne/:ci", adminOnly, getOne);
router.get("/getShift/:ci", adminOnly, getShift);

// Public — listed in server.js PUBLIC_ROUTES. authToken does not run for it.
router.post("/login", loginUser);

router.post("/registerUser", adminOnly, registerUser);
router.post("/addShift", adminOnly, addShift);

router.put("/updateStatus/:ci", adminOnly, updateEmployeeStatus);

router.delete("/remove/:id", adminOnly, deleteShift);
router.delete("/removeEmployee/:id", adminOnly, deleteEmployee);

module.exports = router;
