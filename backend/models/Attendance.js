const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    studentName: { type: String, trim: true },
    studentEmail: { type: String, lowercase: true, trim: true },
    date: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ["Present", "Absent", "Exempt"],
      required: [true, "Status is required"],
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate attendance for same student on same day
attendanceSchema.index({ studentId: 1, date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);

