const express = require("express");
const Quiz = require("../models/Quiz");
const Submission = require("../models/Submission");
const auth = require("../middleware/auth");
const roleAuth = require("../middleware/roleAuth");
const { generateQuiz } = require("../services/aiQuizGenerator");
const { isValidObjectId } = require("../middleware/validate");

const router = express.Router();

// @route   POST /quiz/create
// @desc    Create a quiz manually (teacher only)
router.post("/create", auth, roleAuth("teacher"), async (req, res) => {
  try {
    const { question, options, answer } = req.body;

    if (!question || !options || !answer) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (typeof question !== "string" || question.trim().length < 3) {
      return res.status(400).json({ error: "Question must be at least 3 characters" });
    }

    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      return res.status(400).json({ error: "Between 2 and 6 options are required" });
    }

    // Ensure all options are non-empty strings
    const cleanOptions = options.map((o) => (typeof o === "string" ? o.trim() : ""));
    if (cleanOptions.some((o) => !o)) {
      return res.status(400).json({ error: "All options must be non-empty" });
    }

    if (!cleanOptions.includes(answer)) {
      return res.status(400).json({ error: "Answer must be one of the options" });
    }

    const quiz = new Quiz({
      question: question.trim(),
      options: cleanOptions,
      answer,
    });
    await quiz.save();
    res.status(201).json({ message: "Quiz created", quiz });
  } catch (err) {
    console.error("Create quiz error:", err);
    res.status(500).json({ error: "Failed to create quiz" });
  }
});

// @route   POST /quiz/ai-generate
// @desc    Generate quiz using AI from a topic (teacher only)
router.post("/ai-generate", auth, roleAuth("teacher"), async (req, res) => {
  try {
    const { topic, count } = req.body;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return res.status(400).json({ error: "Topic is required" });
    }

    if (topic.trim().length > 100) {
      return res.status(400).json({ error: "Topic must be under 100 characters" });
    }

    const questionCount = Math.min(Math.max(parseInt(count) || 3, 1), 10);

    const questions = await generateQuiz(topic.trim(), questionCount);

    // Save all generated quizzes to database
    const savedQuizzes = [];
    for (const q of questions) {
      // Validate generated data before saving
      if (
        !q.question ||
        !Array.isArray(q.options) ||
        q.options.length < 2 ||
        !q.answer
      ) {
        continue;
      }
      const quiz = new Quiz({
        question: q.question.trim(),
        options: q.options.map((o) => String(o).trim()).filter(Boolean),
        answer: q.answer,
      });
      if (quiz.options.length >= 2 && quiz.options.includes(quiz.answer)) {
        await quiz.save();
        savedQuizzes.push(quiz);
      }
    }

    if (savedQuizzes.length === 0) {
      return res.status(500).json({ error: "Failed to generate valid quizzes. Please try again." });
    }

    res.status(201).json({
      message: `${savedQuizzes.length} quiz questions generated and published!`,
      quizzes: savedQuizzes,
    });
  } catch (err) {
    console.error("AI generate quiz error:", err);
    res.status(500).json({ error: "Failed to generate quiz with AI" });
  }
});

// @route   GET /quiz
// @desc    Get all quizzes
router.get("/", auth, async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    // Don't send answer to students
    const safeQuizzes = quizzes.map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options,
    }));
    res.json(safeQuizzes);
  } catch (err) {
    console.error("Fetch quizzes error:", err);
    res.status(500).json({ error: "Failed to fetch quizzes" });
  }
});

// @route   DELETE /quiz/:id
// @desc    Delete a quiz (teacher only)
router.delete("/:id", auth, roleAuth("teacher"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid quiz ID" });
    }

    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Also remove related submissions
    await Submission.deleteMany({ quizId: req.params.id });

    res.json({ message: "Quiz deleted" });
  } catch (err) {
    console.error("Delete quiz error:", err);
    res.status(500).json({ error: "Failed to delete quiz" });
  }
});

// @route   POST /quiz/submit
// @desc    Submit a quiz answer (student only)
router.post("/submit", auth, roleAuth("student"), async (req, res) => {
  try {
    const { quizId, selectedAnswer } = req.body;

    if (!quizId || !selectedAnswer) {
      return res.status(400).json({ error: "quizId and selectedAnswer are required" });
    }

    if (!isValidObjectId(quizId)) {
      return res.status(400).json({ error: "Invalid quiz ID" });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    if (!quiz.options.includes(selectedAnswer)) {
      return res.status(400).json({ error: "Invalid answer option" });
    }

    // Check if already submitted
    const existingSubmission = await Submission.findOne({
      studentId: req.user.id,
      quizId,
    });

    if (existingSubmission) {
      return res.status(400).json({ error: "You have already answered this quiz" });
    }

    const isCorrect = quiz.answer === selectedAnswer;
    const submission = new Submission({
      studentId: req.user.id,
      quizId,
      selectedAnswer,
      isCorrect,
    });

    await submission.save();
    res.json({ message: "Answer submitted", isCorrect });
  } catch (err) {
    console.error("Submit answer error:", err);
    res.status(500).json({ error: "Failed to submit answer" });
  }
});

// @route   GET /quiz/results/:studentId
// @desc    Get quiz results
router.get("/results/:studentId", auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Students can only see their own results
    if (req.user.role === "student" && req.user.id !== studentId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!isValidObjectId(studentId)) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    const submissions = await Submission.find({ studentId }).populate("quizId");

    res.json(submissions);
  } catch (err) {
    console.error("Fetch results error:", err);
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

// @route   GET /quiz/all-results
// @desc    Get all quiz results (teacher only)
router.get("/all-results", auth, roleAuth("teacher"), async (req, res) => {
  try {
    const submissions = await Submission.find()
      .populate("quizId")
      .populate("studentId", "name email")
      .sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    console.error("Fetch all results error:", err);
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

module.exports = router;

