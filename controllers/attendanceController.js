const Attendance = require("../models/attendanceModel");

// Retrieve all attendances
const getAttendances = async (req, res) => {
  try {
    const attendances = await Attendance.getAll();
    res.status(200).json(attendances);
  } catch (error) {
    console.error("Error retrieving attendances:", error);
    res.status(500).json({ message: "Error retrieving attendances." });
  }
};

// Get today's attendances
const getTodayAttendances = async (req, res) => {
    try {
      
      const dayAttendances = await Attendance.getDayAttendances();
      res.status(200).json(dayAttendances);
    } catch (error) {
      console.error("Error retrieving today's attendances:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

// Retrieve an attendance by ID
const getAttendanceByCi = async (req, res) => {
  const { ci } = req.params;
  try {
    const attendance = await Attendance.getByCi(ci);
    if (attendance.length === 0) {
      return res.status(404).json({ message: "Ninguna asistencia encontrada para este cliente" });
    }
    res.status(200).json(attendance);
  } catch (error) {
    console.error("Error retrieving attendance:", error);
    res.status(500).json({ message: "Error retrieving attendance." });
  }
};

// Add a new attendance
const addAttendance = async (req, res) => {
    const { ci, method } = req.body;
  
    try {
      const newAttendance = await Attendance.create({ ci, method });
      res.status(201).json({ message: newAttendance.p_message });
    } catch (error) {
      console.error("Error adding attendance:", error);
  
      // Extract and forward the PostgreSQL exception message
      if (error.message.includes("Cliente no registrado aún")) {
        res.status(400).json({ error: "Cliente no registrado aún." });
      } else if (error.message.includes("Ninguna membresia encontrada para este cliente")) {
        res.status(400).json({ error: "Ninguna membresia encontrada para este cliente." });
      } else if (error.message.includes("La membresía ya expiró")) {
        res.status(400).json({ error: "La membresía ya expiró." });
      } else if (error.message.includes("Ya no quedan entradas en la membresía")) {
        res.status(400).json({ error: "Ya no quedan entradas en la membresía." });
      } else {
        res.status(500).json({ error: "Error interno del servidor." });
      }
    }
  };
  

// Delete an attendance   (Check its usability)
const deleteAttendance = async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id) || Number(id) <= 0) {
    return res
      .status(400)
      .json({ message: "El id debe ser un entero positivo." });
  }

  try {
    const deletedCount = await Attendance.remove(Number(id));
    if (!deletedCount) {
      return res.status(404).json({ message: "Attendance not found." });
    }
    res.status(200).json({ message: "Attendance record deleted" });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    res.status(500).json({ message: "Error deleting attendance." });
  }
};

module.exports = {
  getAttendances,
  getTodayAttendances,
  getAttendanceByCi,
  addAttendance,
  deleteAttendance,
};