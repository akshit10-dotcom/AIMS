const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Generate quiz questions using AI (Gemini)
 * @param {string} topic - The topic to generate questions about
 * @param {number} count - Number of questions to generate (default 3)
 * @returns {Array} Array of {question, options, answer} objects
 */
async function generateQuiz(topic, count = 3) {
  // If no API key, fall back to template-based generation
  if (!process.env.GEMINI_API_KEY) {
    return generateTemplateQuiz(topic, count);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Generate ${count} multiple-choice quiz questions about "${topic}".
    
For each question, provide:
- A clear question
- 4 answer options (one correct, three incorrect)
- The correct answer

Return the response as a valid JSON array ONLY, with no other text. Format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Correct option text"
  }
]`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const questions = JSON.parse(jsonStr);
    return questions.slice(0, count);
  } catch (err) {
    console.error("AI Quiz generation error:", err.message);
    // Fall back to template-based if AI fails
    return generateTemplateQuiz(topic, count);
  }
}

/**
 * Template-based quiz generation (fallback when no AI API key)
 */
function generateTemplateQuiz(topic, count = 3) {
  const templates = [
    {
      question: `What is the primary focus of "${topic}"?`,
      options: [
        `Understanding core concepts of ${topic}`,
        `Memorizing ${topic} facts`,
        `Ignoring ${topic} principles`,
        `Avoiding ${topic} topics`,
      ],
      answer: `Understanding core concepts of ${topic}`,
    },
    {
      question: `Which of the following best describes "${topic}"?`,
      options: [
        `A comprehensive field of study`,
        `A simple concept`,
        `An unrelated subject`,
        `A modern invention`,
      ],
      answer: `A comprehensive field of study`,
    },
    {
      question: `Why is "${topic}" important to learn?`,
      options: [
        `It provides valuable knowledge and skills`,
        `It has no real-world applications`,
        `It is only useful for exams`,
        `It is outdated information`,
      ],
      answer: `It provides valuable knowledge and skills`,
    },
    {
      question: `What is a key principle of "${topic}"?`,
      options: [
        `Applying theoretical knowledge to practice`,
        `Avoiding practical applications`,
        `Focusing only on theory`,
        `Ignoring best practices`,
      ],
      answer: `Applying theoretical knowledge to practice`,
    },
    {
      question: `How does "${topic}" impact our daily lives?`,
      options: [
        `In numerous significant ways`,
        `It has no impact`,
        `Only in academic settings`,
        `Only in professional environments`,
      ],
      answer: `In numerous significant ways`,
    },
    {
      question: `What is the best approach to learning "${topic}"?`,
      options: [
        `Combining theory with practical exercises`,
        `Only reading textbooks`,
        `Watching videos without practice`,
        `Memorizing without understanding`,
      ],
      answer: `Combining theory with practical exercises`,
    },
  ];

  // Shuffle and pick 'count' questions
  const shuffled = [...templates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((q) => ({
    question: q.question,
    options: q.options,
    answer: q.answer,
  }));
}

module.exports = { generateQuiz };

