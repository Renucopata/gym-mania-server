const Report = require("../models/reportsModel");


const getMembershipsReport = async (req, res) => {
    
  try {
    const report = await Report.getFullMemberships();
    res.status(200).json({ message: "Report retrieved successfully", data: report });
  } catch (error) {
    console.error("Error retrieving clients:", error);
    res.status(500).json({ message: error.message});
  }
};

const getMembershipsByDateReport = async (req, res) => {
    const {dateA, dateB} = req.body;
    try {
      const report = await Report.getMembershipsByRange({dateA, dateB});
      res.status(200).json({ message: "Report retrieved successfully", data: report });
    } catch (error) {
      console.error("Error retrieving Report:", error);
      res.status(500).json({ message: error.message });
    }
  };


  const getAttendanceReport = async (req, res) => {
    try {
      const report = await Report.getFullAttendances();
      res.status(200).json({ message: "Report retrieved successfully", data: report });
    } catch (error) {
      console.error("Error retrieving Report:", error);
      res.status(500).json({ message: error.message });
    }
  };


  const getattendanceByDateReport = async (req, res) => {
    const {dateA, dateB} = req.body;
    try {
      const report = await Report.getAtendancesByRange({dateA, dateB});
      res.status(200).json({ message: "Report retrieved successfully", data: report });
    } catch (error) {
      console.error("Error retrieving Report:", error);
      res.status(500).json({ message: error.message });
    }
  };

  const getClientReport = async (req, res) => {
    const { ci } = req.params;
    try {
      const report = await Report.getClient(ci);
      res.status(200).json({ message: "Report retrieved successfully", data: report });
    } catch (error) {
      console.error("Error retrieving clients:", error);
      res.status(500).json({ message: error.message});
    }
  };


module.exports = { getMembershipsReport, getMembershipsByDateReport, getAttendanceReport , getattendanceByDateReport, getClientReport };