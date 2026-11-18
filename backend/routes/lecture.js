const express = require("express");
const Lecture = require("../models/Lecture");
const auth = require("../middleware/auth");
const roleAuth = require("../middleware/roleAuth");
const { isValidObjectId } = require("../middleware/validate");

const router = express.Router();

// Validate time format HH:MM
function isValidTime(time) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

// @route   POST /lecture/add
// @desc    Add a lecture (teacher only)
router.post("/add", auth, roleAuth("teacher"), async (req, res) => {
  try {
    const { subject, date, startTime, endTime } = req.body;

    if (!subject || !date || !startTime || !endTime) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (typeof subject !== "string" || subject.trim().length < 2) {
      return res.status(400).json({ error: "Subject must be at least 2 characters" });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return res.status(400).json({ error: "Invalid time format. Use HH:MM" });
    }

    if (startTime >= endTime) {
      return res.status(400).json({ error: "Start time must be before end time" });
    }

    const lecture = new Lecture({
      subject: subject.trim(),
      teacher: req.user.email,
      date,
      startTime,
      endTime,
    });

    await lecture.save();
    res.status(201).json({ message: "Lecture added", lecture });
  } catch (err) {
    console.error("Add lecture error:", err);
    res.status(500).json({ error: "Failed to add lecture" });
  }
});

// @route   GET /lecture/:date
// @desc    Get lectures by date
router.get("/:date", auth, async (req, res) => {
  try {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }

    const lectures = await Lecture.find({ date }).sort({ startTime: 1 });
    res.json(lectures);
  } catch (err) {
    console.error("Fetch lectures error:", err);
    res.status(500).json({ error: "Failed to fetch lectures" });
  }
});

// @route   DELETE /lecture/:id
// @desc    Delete a lecture (teacher only)
router.delete("/:id", auth, roleAuth("teacher"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid lecture ID" });
    }

    const lecture = await Lecture.findByIdAndDelete(req.params.id);
    if (!lecture) {
      return res.status(404).json({ error: "Lecture not found" });
    }
    res.json({ message: "Lecture deleted" });
  } catch (err) {
    console.error("Delete lecture error:", err);
    res.status(500).json({ error: "Failed to delete lecture" });
  }
});

module.exports = router;

