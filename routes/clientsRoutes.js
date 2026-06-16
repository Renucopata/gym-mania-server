const express = require("express");
const {getClients, addClient, updateClient, deleteClient, uploadPhoto, getPhoto, getOneClient, updateTryDay  } = require("../controllers/clientsController");
const uploadPhotoMid = require("../middlewares/uploadPhotoMid");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

// Every client-management route is staff-only.
router.use(requireRole(["employee", "admin"]));

// GET all clients
router.get("/getAll", getClients);
// GET all clients
router.get("/getOne/:ci", getOneClient);

// POST a new client
router.post("/addNew", addClient);

// Route to upload a photo for a specific client
router.post("/:ci/uploadPht", uploadPhotoMid.single("photo"), uploadPhoto);

// Route to retrieve the photo for a specific client
router.get("/:ci/photo", getPhoto);

// PUT update try day
router.put("/tryDay/:ci", updateTryDay);

// PUT update a client
router.put("/update/:id", updateClient);

// DELETE a client
router.delete("/remove/:id", deleteClient);

module.exports = router;
