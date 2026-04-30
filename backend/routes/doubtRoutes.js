const express  = require("express");
const router   = express.Router();
const supabase = require("../config/supabase");
const protect  = require("../middleware/authMiddleware");

// =====================================================
// ❓ DOUBT ROUTES — College Help Hub
// =====================================================
//
// ROUTE MAP:
//   POST   /api/doubts/ask       → Ask a question      🔒 Protected
//   GET    /api/doubts/all       → Get all questions   🔓 Public
//   GET    /api/doubts/:id       → Get one question    🔓 Public
//   DELETE /api/doubts/:id       → Delete question     🔒 Protected
//
// =====================================================


// ================= ASK A QUESTION =================
// 🔒 Protected — only logged-in users can ask
// URL: POST http://localhost:5000/api/doubts/ask
router.post("/ask", protect, async (req, res) => {
  const { question } = req.body;

  // --- Step 1: Validate ---
  if (!question || question.trim() === "") {
    return res.status(400).json({ message: "Question cannot be empty ❌" });
  }

  if (question.length < 10) {
    return res.status(400).json({ message: "Question is too short. Add more detail ❌" });
  }

  // --- Step 2: Get user from middleware (safe — can't be faked) ---
  const user_id = req.user.id;

  try {
    const { data, error } = await supabase
      .from("doubts")
      .insert([{ 
        question: question.trim(), // remove extra spaces
        user_id 
      }])
      .select("id, question, user_id, created_at");

    if (error) {
      console.error("Ask doubt error:", error.message);
      return res.status(500).json({ message: "Could not post question. Try again ❌" });
    }

    res.status(201).json({ 
      message: "Question posted successfully ✅", 
      data: data[0] 
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= GET ALL QUESTIONS =================
// 🔓 Public — anyone can read questions
// URL: GET http://localhost:5000/api/doubts/all
router.get("/all", async (req, res) => {
  try {
    // Join with users table to get the username of who asked
    // This is like a "lookup" — instead of showing user_id: 5,
    // we show username: "Anjali" — much better for the UI!
    const { data, error } = await supabase
      .from("doubts")
      .select(`
        id,
        question,
        created_at,
        user_id,
        users ( username )
      `)
      .order("created_at", { ascending: false }); // newest first

    if (error) {
      console.error("Get doubts error:", error.message);
      return res.status(500).json({ message: "Could not fetch questions ❌" });
    }

    // --- Handle empty state ---
    if (!data || data.length === 0) {
      return res.json({ message: "No questions yet. Be the first to ask!", data: [] });
    }

    res.json({ message: "Questions fetched ✅", data });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= GET ONE QUESTION (with answers) =================
// 🔓 Public — view a single question and all its answers
// URL: GET http://localhost:5000/api/doubts/123
router.get("/:id", async (req, res) => {
  const doubtId = req.params.id;

  if (!doubtId || isNaN(doubtId)) {
    return res.status(400).json({ message: "Invalid question ID ❌" });
  }

  try {
    // Get the question
    const { data: doubt, error: doubtError } = await supabase
      .from("doubts")
      .select(`
        id,
        question,
        created_at,
        user_id,
        users ( username )
      `)
      .eq("id", doubtId)
      .limit(1);

    if (doubtError || !doubt || doubt.length === 0) {
      return res.status(404).json({ message: "Question not found ❌" });
    }

    // Get all answers for this question
    const { data: answers, error: answersError } = await supabase
      .from("answers")
      .select(`
        id,
        answer,
        upvotes,
        created_at,
        user_id,
        users ( username )
      `)
      .eq("doubt_id", doubtId)
      .order("upvotes", { ascending: false }); // most upvoted first

    if (answersError) {
      console.error("Get answers error:", answersError.message);
    }

    res.json({
      message: "Question fetched ✅",
      data: {
        ...doubt[0],
        answers: answers || []
      }
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= DELETE QUESTION =================
// 🔒 Protected — only the question's owner can delete it
// URL: DELETE http://localhost:5000/api/doubts/123
router.delete("/:id", protect, async (req, res) => {
  const doubtId = req.params.id;
  const userId  = req.user.id;

  try {
    // Check it exists and belongs to this user
    const { data: doubt } = await supabase
      .from("doubts")
      .select("id, user_id")
      .eq("id", doubtId)
      .limit(1);

    if (!doubt || doubt.length === 0) {
      return res.status(404).json({ message: "Question not found ❌" });
    }

    if (doubt[0].user_id !== userId) {
      return res.status(403).json({ message: "You can only delete your own questions ❌" });
    }

    const { error } = await supabase
      .from("doubts")
      .delete()
      .eq("id", doubtId);

    if (error) {
      console.error("Delete doubt error:", error.message);
      return res.status(500).json({ message: "Could not delete question ❌" });
    }

    res.json({ message: "Question deleted ✅" });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


module.exports = router;