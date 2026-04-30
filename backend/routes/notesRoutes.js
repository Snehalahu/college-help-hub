const express  = require("express");
const router   = express.Router();
const supabase = require("../config/supabase");
const protect  = require("../middleware/authMiddleware");

// =====================================================
// 📝 NOTES ROUTES — College Help Hub
// =====================================================
//
// ROUTE MAP:
//   POST  /api/notes/add        → Add a new note       🔒 Protected
//   GET   /api/notes/           → Get ALL notes        🔓 Public
//   GET   /api/notes/user/:id   → Get notes by user    🔓 Public
//   DELETE /api/notes/:id       → Delete a note        🔒 Protected
//
// =====================================================


// ================= ADD NOTE =================
// 🔒 Protected — only logged-in users can upload notes
// URL: POST http://localhost:5000/api/notes/add
router.post("/add", protect, async (req, res) => {
  const { title, subject, content } = req.body;

  // --- Step 1: Validate inputs ---
  if (!title || !subject || !content) {
    return res.status(400).json({ message: "Title, subject and content are required ❌" });
  }

  // --- Step 2: Get user ID from middleware (not from body — safer!) ---
  // protect middleware already verified the user and put their info in req.user
  // So we trust req.user.id instead of trusting whatever the browser sends
  const user_id = req.user.id;

  try {
    // --- Step 3: Insert note into Supabase ---
    const { data, error } = await supabase
      .from("notes")
      .insert([{ title, subject, content, user_id }])
      .select("id, title, subject, content, user_id, created_at");

    if (error) {
      console.error("Add note error:", error.message);
      return res.status(500).json({ message: "Could not save note. Try again ❌" });
    }

    res.status(201).json({ message: "Note added successfully ✅", data: data[0] });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= GET ALL NOTES =================
// 🔓 Public — anyone can browse notes
// URL: GET http://localhost:5000/api/notes/
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false }); // newest notes first

    if (error) {
      console.error("Get notes error:", error.message);
      return res.status(500).json({ message: "Could not fetch notes ❌" });
    }

    // --- Handle empty state (no notes yet) ---
    if (!data || data.length === 0) {
      return res.json({ message: "No notes found", data: [] });
    }

    res.json({ message: "Notes fetched ✅", data });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= GET NOTES BY USER =================
// 🔓 Public — used to show a user's notes on their dashboard
// URL: GET http://localhost:5000/api/notes/user/123
router.get("/user/:id", async (req, res) => {
  const userId = req.params.id;

  // --- Validate: make sure ID is a number ---
  if (!userId || isNaN(userId)) {
    return res.status(400).json({ message: "Invalid user ID ❌" });
  }

  try {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }); // newest first

    if (error) {
      console.error("Get user notes error:", error.message);
      return res.status(500).json({ message: "Could not fetch notes ❌" });
    }

    res.json({ message: "User notes fetched ✅", data: data || [] });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= DELETE NOTE =================
// 🔒 Protected — only the note's owner can delete it
// URL: DELETE http://localhost:5000/api/notes/123
router.delete("/:id", protect, async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user.id; // from middleware

  try {
    // --- Step 1: Check note exists AND belongs to this user ---
    const { data: note, error: findError } = await supabase
      .from("notes")
      .select("id, user_id")
      .eq("id", noteId)
      .limit(1);

    if (findError || !note || note.length === 0) {
      return res.status(404).json({ message: "Note not found ❌" });
    }

    // --- Step 2: Make sure the user owns this note ---
    if (note[0].user_id !== userId) {
      return res.status(403).json({ message: "You can only delete your own notes ❌" });
    }

    // --- Step 3: Delete the note ---
    const { error: deleteError } = await supabase
      .from("notes")
      .delete()
      .eq("id", noteId);

    if (deleteError) {
      console.error("Delete note error:", deleteError.message);
      return res.status(500).json({ message: "Could not delete note ❌" });
    }

    res.json({ message: "Note deleted successfully ✅" });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


module.exports = router;