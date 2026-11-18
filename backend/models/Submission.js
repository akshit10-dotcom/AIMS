const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student ID is required"],
      index: true,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: [true, "Quiz ID is required"],
      index: true,
    },
    selectedAnswer: { type: String, required: [true, "Selected answer is required"] },
    isCorrect: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent duplicate submissions: one submission per student per quiz
submissionSchema.index({ studentId: 1, quizId: 1 }, { unique: true });

module.exports = mongoose.model("Submission", submissionSchema);

