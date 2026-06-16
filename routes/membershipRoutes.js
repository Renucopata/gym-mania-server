const express = require("express");
const {
  getAllMemberships,
  getMembershipById,
  createMembership,
  updateMembership,
  deleteMembership,
  getOneMembership,
} = require("../controllers/membershipController");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

// Every membership-management route is staff-only.
router.use(requireRole(["employee", "admin"]));

// GET all memberships
router.get("/getAll", getAllMemberships);

// GET all memberships
router.get("/getOne/:id", getOneMembership);

// GET a membership by ci
router.get("/getByCi/:ci", getMembershipById);

// POST a new membership
router.post("/addNew", createMembership);

// PUT update a membership
router.put("/update/:id", updateMembership);

// DELETE a membership
router.delete("/remove/:id", deleteMembership);

module.exports = router;
