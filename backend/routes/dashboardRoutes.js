const express  = require("express");
const router   = express.Router();
const supabase = require("../config/supabase");
const protect  = require("../middleware/authMiddleware");

// =====================================================
// 📊 DASHBOARD ROUTES — College Help Hub
// =====================================================
//
// ROUTE MAP:
//   GET /api/dashboard/:user_id  → Get all dashboard data  🔒 Protected
//
// This is the MOST IMPORTANT route for the dashboard page.
// It fetches everything in one go:
//   ✅ User profile info
//   ✅ User's uploaded notes
//   ✅ User's asked questions (doubts)
//   ✅ User's posted answers
//   ✅ Count of each
//
// =====================================================


// ================= GET DASHBOARD DATA =================
// 🔒 Protected — users can only see their OWN dashboard
// URL: GET http://localhost:5000/api/dashboard/123
router.get("/:user_id", protect, async (req, res) => {
  const userId = req.params.user_id;

  // --- Step 1: Validate user ID ---
  if (!userId || isNaN(userId)) {
    return res.status(400).json({ message: "Invalid user ID ❌" });
  }

  // --- Step 2: Security check ---
  // Make sure logged-in user can only see THEIR OWN dashboard
  // Without this, user 5 could view user 6's dashboard by changing the URL!
  if (parseInt(userId) !== parseInt(req.user.id)) {
    return res.status(403).json({ 
      message: "You can only view your own dashboard ❌" 
    });
  }

  try {

    // --- Step 3: Get user profile ---
    // We already have this from middleware but let's get fresh data
    const { data: userProfile, error: userError } = await supabase
      .from("users")
      .select("id, username, email, created_at")
      .eq("id", userId)
      .limit(1);

    if (userError || !userProfile || userProfile.length === 0) {
      return res.status(404).json({ message: "User not found ❌" });
    }

    // --- Step 4: Get user's notes ---
    const { data: notes, error: notesError } = await supabase
      .from("notes")
      .select("id, title, subject, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }); // newest first

    if (notesError) {
      console.error("Dashboard notes error:", notesError.message);
    }

    // --- Step 5: Get user's doubts/questions ---
    const { data: doubts, error: doubtsError } = await supabase
      .from("doubts")
      .select("id, question, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (doubtsError) {
      console.error("Dashboard doubts error:", doubtsError.message);
    }

    // --- Step 6: Get user's answers ---
    const { data: answers, error: answersError } = await supabase
      .from("answers")
      .select("id, answer, upvotes, created_at, doubt_id")
      .eq("user_id", userId)
      .order("upvotes", { ascending: false }); // most upvoted first

    if (answersError) {
      console.error("Dashboard answers error:", answersError.message);
    }

    // --- Step 7: Send everything back in one response ---
    res.json({
      message: "Dashboard loaded ✅",
      data: {

        // User profile info
        user: userProfile[0],

        // Summary counts (for the stats cards at top of dashboard)
        stats: {
          totalNotes:   notes?.length   || 0,
          totalDoubts:  doubts?.length  || 0,
          totalAnswers: answers?.length || 0,
          // Calculate total upvotes received across all answers
          totalUpvotes: answers?.reduce((sum, a) => sum + (a.upvotes || 0), 0) || 0
        },

        // Full data lists (for showing cards below)
        notes:   notes   || [],
        doubts:  doubts  || [],
        answers: answers || []

      }
    });

  } catch (err) {
    console.error("Dashboard server error:", err);
    res.status(500).json({ message: "Could not load dashboard ❌" });
  }
});


module.exports = router;