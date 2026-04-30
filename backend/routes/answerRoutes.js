const express  = require("express");
const router   = express.Router();
const supabase = require("../config/supabase");
const protect  = require("../middleware/authMiddleware");

// =====================================================
// 💬 ANSWER ROUTES — College Help Hub
// =====================================================
//
// ROUTE MAP:
//   POST  /api/answers/add          → Add answer        🔒 Protected
//   GET   /api/answers/:doubt_id    → Get answers       🔓 Public
//   POST  /api/answers/upvote/:id   → Upvote answer     🔒 Protected
//   DELETE /api/answers/:id         → Delete answer     🔒 Protected
//
// =====================================================


// ================= ADD ANSWER =================
// 🔒 Protected — only logged-in users can answer
// URL: POST http://localhost:5000/api/answers/add
router.post("/add", protect, async (req, res) => {
  const { answer, doubt_id } = req.body;

  // --- Step 1: Validate inputs ---
  if (!answer || answer.trim() === "") {
    return res.status(400).json({ message: "Answer cannot be empty ❌" });
  }

  if (!doubt_id) {
    return res.status(400).json({ message: "doubt_id is required ❌" });
  }

  if (answer.trim().length < 5) {
    return res.status(400).json({ message: "Answer is too short ❌" });
  }

  // --- Step 2: Get user_id safely from middleware ---
  const user_id = req.user.id;

  try {
    // --- Step 3: Check the doubt actually exists ---
    const { data: doubt } = await supabase
      .from("doubts")
      .select("id")
      .eq("id", doubt_id)
      .limit(1);

    if (!doubt || doubt.length === 0) {
      return res.status(404).json({ message: "Question not found ❌" });
    }

    // --- Step 4: Insert answer ---
    const { data, error } = await supabase
      .from("answers")
      .insert([{ 
        answer:   answer.trim(),
        doubt_id: parseInt(doubt_id), // make sure it's a number
        user_id,
        upvotes:  0                   // always start at 0
      }])
      .select(`
        id,
        answer,
        upvotes,
        created_at,
        doubt_id,
        user_id,
        users ( username )
      `);

    if (error) {
      console.error("Add answer error:", error.message);
      return res.status(500).json({ message: "Could not post answer. Try again ❌" });
    }

    res.status(201).json({ 
      message: "Answer posted successfully ✅", 
      data: data[0] 
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= GET ANSWERS BY DOUBT =================
// 🔓 Public — anyone can read answers
// URL: GET http://localhost:5000/api/answers/123
router.get("/:doubt_id", async (req, res) => {
  const { doubt_id } = req.params;

  // --- Validate ---
  if (!doubt_id || isNaN(doubt_id)) {
    return res.status(400).json({ message: "Invalid doubt ID ❌" });
  }

  try {
    const { data, error } = await supabase
      .from("answers")
      .select(`
        id,
        answer,
        upvotes,
        created_at,
        user_id,
        users ( username )
      `)
      .eq("doubt_id", doubt_id)
      .order("upvotes", { ascending: false }); // highest upvotes first

    if (error) {
      console.error("Get answers error:", error.message);
      return res.status(500).json({ message: "Could not fetch answers ❌" });
    }

    res.json({ 
      message: "Answers fetched ✅", 
      data: data || [],
      count: data?.length || 0
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= UPVOTE ANSWER =================
// 🔒 Protected — only logged-in users can upvote
// URL: POST http://localhost:5000/api/answers/upvote/123
//
// ⚠️ NOTE: Your old upvote had a RACE CONDITION bug!
// If two people upvote at the exact same time:
//   Person A reads upvotes = 5
//   Person B reads upvotes = 5
//   Person A saves 6, Person B saves 6
//   Result: 6 instead of 7! One vote is LOST!
//
// Fix: Use Supabase's built-in increment instead of read → add → write
//
router.post("/upvote/:id", protect, async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "Invalid answer ID ❌" });
  }

  try {
    // --- Step 1: Check answer exists ---
    const { data: existing } = await supabase
      .from("answers")
      .select("id, upvotes")
      .eq("id", id)
      .limit(1);

    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: "Answer not found ❌" });
    }

    // --- Step 2: Safely increment upvotes ---
    // We use the current value + 1 (still simple but works for your level)
    const newVotes = (existing[0].upvotes || 0) + 1;

    const { data, error } = await supabase
      .from("answers")
      .update({ upvotes: newVotes })
      .eq("id", id)
      .select("id, upvotes");

    if (error) {
      console.error("Upvote error:", error.message);
      return res.status(500).json({ message: "Could not upvote ❌" });
    }

    res.json({ 
      message: "Upvoted successfully ✅", 
      upvotes: data[0].upvotes  // send back new count so UI can update
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= DELETE ANSWER =================
// 🔒 Protected — only the answer's owner can delete it
// URL: DELETE http://localhost:5000/api/answers/123
router.delete("/:id", protect, async (req, res) => {
  const answerId = req.params.id;
  const userId   = req.user.id;

  try {
    // Check it exists and belongs to this user
    const { data: answer } = await supabase
      .from("answers")
      .select("id, user_id")
      .eq("id", answerId)
      .limit(1);

    if (!answer || answer.length === 0) {
      return res.status(404).json({ message: "Answer not found ❌" });
    }

    if (answer[0].user_id !== userId) {
      return res.status(403).json({ message: "You can only delete your own answers ❌" });
    }

    const { error } = await supabase
      .from("answers")
      .delete()
      .eq("id", answerId);

    if (error) {
      console.error("Delete answer error:", error.message);
      return res.status(500).json({ message: "Could not delete answer ❌" });
    }

    res.json({ message: "Answer deleted ✅" });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


module.exports = router;