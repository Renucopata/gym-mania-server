const express = require("express");
const {
  registerMember,
  loginMember,
  me,
} = require("../controllers/memberAuthController");

const router = express.Router();

// Public — listed in server.js PUBLIC_ROUTES.
router.post("/member/register", registerMember);
router.post("/member/login", loginMember);

// Authenticated. authToken runs globally; any valid token (staff or member)
// can call /me, which dispatches by normalized role.
router.get("/me", me);

module.exports = router;
