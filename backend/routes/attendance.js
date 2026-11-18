const express = require("express");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const auth = require("../middleware/auth");
const roleAuth = require("../middleware/roleAuth");
const { isValidObjectId } = require("../middleware/validate");

const router = express.Router();

const VALID_STATUSES = ["Present", "Absent", "Exempt"];

// Helper: get start/end of day for a date
function getDayRange(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return { startOfDay, endOfDay };
}

// @route   POST /attendance/mark
// @desc    Mark a single attendance record (teacher only)
router.post("/mark", auth, roleAuth("teacher"), async (req, res) => {
  try {
    const { studentId, status, date } = req.body;

    if (!studentId || !status) {
      return res.status(400).json({ error: "studentId and status are required" });
    }

    if (!isValidObjectId(studentId)) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Status must be Present, Absent, or Exempt" });
    }

    // Ensure student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const attendanceDate = date ? new Date(date) : new Date();
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({ error: "Invalid date" });
    }

    const { startOfDay, endOfDay } = getDayRange(attendanceDate);

    const existing = await Attendance.findOne({
      studentId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existing) {
      existing.status = status;
      existing.studentName = student.name;
      existing.studentEmail = student.email;
      await existing.save();
      return res.json({ message: "Attendance updated", record: existing });
    }

    const record = new Attendance({
      studentId,
      studentName: student.name,
      studentEmail: student.email,
      status,
      date: attendanceDate,
    });

    await record.save();
    res.status(201).json({ message: "Attendance marked", record });
  } catch (err) {
    console.error("Mark attendance error:", err);
    res.status(500).json({ error: "Failed to mark attendance" });
  }
});

// @route   POST /attendance/bulk-mark
// @desc    Mark attendance for multiple students at once (teacher only)
router.post("/bulk-mark", auth, roleAuth("teacher"), async (req, res) => {
  try {
    const { records, date } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "Records array is required" });
    }

    // Cap number of records to prevent abuse
    if (records.length > 500) {
      return res.status(400).json({ error: "Too many records (max 500)" });
    }

    const attendanceDate = date ? new Date(date) : new Date();
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({ error: "Invalid date" });
    }

    const { startOfDay, endOfDay } = getDayRange(attendanceDate);

    // Validate all records first
    for (const record of records) {
      if (!record.studentId || !isValidObjectId(record.studentId)) {
        return res.status(400).json({ error: "Invalid student ID in records" });
      }
      if (!VALID_STATUSES.includes(record.status)) {
        return res.status(400).json({ error: `Invalid status: ${record.status}` });
      }
    }

    const results = [];

    for (const record of records) {
      const { studentId, status } = record;

      const student = await User.findById(studentId).select("name email");
      if (!student) continue;

      let attRecord = await Attendance.findOne({
        studentId,
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      if (attRecord) {
        attRecord.status = status;
        attRecord.studentName = student.name;
        attRecord.studentEmail = student.email;
        await attRecord.save();
      } else {
        attRecord = new Attendance({
          studentId,
          studentName: student.name,
          studentEmail: student.email,
          status,
          date: attendanceDate,
        });
        await attRecord.save();
      }

      results.push(attRecord);
    }

    res.status(201).json({
      message: `Attendance marked for ${results.length} students`,
      records: results,
    });
  } catch (err) {
    console.error("Bulk mark attendance error:", err);
    res.status(500).json({ error: "Failed to mark attendance" });
  }
});

// @route   GET /attendance/students-list
// @desc    Get all students with their attendance for a given date (teacher only)
router.get("/students-list", auth, roleAuth("teacher"), async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Invalid date" });
    }

    const { startOfDay, endOfDay } = getDayRange(targetDate);

    // Get all students
    const students = await User.find({ role: "student" }).select("_id name email").sort({ name: 1 });

    // Get attendance records for the date
    const attendanceRecords = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    const studentList = students.map((student) => {
      const attRecord = attendanceRecords.find(
        (a) => a.studentId.toString() === student._id.toString()
      );
      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        status: attRecord ? attRecord.status : "Unmarked",
      };
    });

    res.json({ date: targetDate.toISOString().split("T")[0], students: studentList });
  } catch (err) {
    console.error("Fetch student list error:", err);
    res.status(500).json({ error: "Failed to fetch student list" });
  }
});

// @route   GET /attendance/percentage/:studentId
// @desc    Get attendance percentage for a student
// @access  Student (own data only) or Teacher (any student)
router.get("/percentage/:studentId", auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // --- IDOR FIX: students can only view their own attendance ---
    if (req.user.role === "student" && req.user.id !== studentId) {
      return res.status(403).json({ error: "Access denied. You can only view your own attendance." });
    }

    if (!isValidObjectId(studentId)) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    const records = await Attendance.find({ studentId });

    if (records.length === 0) {
      return res.json({
        attended: 0,
        exempted: 0,
        totalClasses: 0,
        percentage: 0,
        meetsRequirement: false,
        threshold: 75,
      });
    }

    const totalClasses = records.length;
    const attended = records.filter((r) => r.status === "Present").length;
    const exempted = records.filter((r) => r.status === "Exempt").length;
    const effectiveAttended = attended + exempted;
    const percentage = ((effectiveAttended / totalClasses) * 100).toFixed(2);

    const threshold = 75;
    const meetsRequirement = parseFloat(percentage) >= threshold;

    res.json({
      attended,
      exempted,
      totalClasses,
      percentage,
      meetsRequirement,
      threshold,
    });
  } catch (err) {
    console.error("Attendance percentage error:", err);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

// @route   GET /attendance/all/:studentId
// @desc    Get all attendance records for a student
// @access  Student (own data only) or Teacher (any student)
router.get("/all/:studentId", auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // --- IDOR FIX: students can only view their own records ---
    if (req.user.role === "student" && req.user.id !== studentId) {
      return res.status(403).json({ error: "Access denied. You can only view your own attendance." });
    }

    if (!isValidObjectId(studentId)) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    const records = await Attendance.find({ studentId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    console.error("Fetch attendance error:", err);
    res.status(500).json({ error: "Failed to fetch attendance records" });
  }
});

module.exports = router;

