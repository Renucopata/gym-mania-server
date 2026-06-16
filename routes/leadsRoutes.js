const express = require("express");
const {
  submitContact,
  listLeads,
  getLead,
  updateLead,
} = require("../controllers/leadsController");
const requireRole = require("../middlewares/requireRole");
const { contactFormLimiter } = require("../middlewares/rateLimiters");

const router = express.Router();

// Public — anonymous landing-page contact form. Rate-limited per IP.
router.post("/contact", contactFormLimiter, submitContact);

// Staff CRM.
const staffOnly = requireRole(["employee", "admin"]);
router.get("/", staffOnly, listLeads);
router.get("/:id", staffOnly, getLead);
router.patch("/:id", staffOnly, updateLead);

module.exports = router;
