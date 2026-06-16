const multer = require("multer");

// Configure Multer for in-memory storage
const uploadPhotoMid = multer({
  storage: multer.memoryStorage(), // Store files temporarily in memory
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

module.exports = uploadPhotoMid;
