// =====================================================
// 🛡️ AUTH MIDDLEWARE — College Help Hub
// =====================================================
// 
// WHAT IS MIDDLEWARE? Think of it like a SECURITY GUARD.
//
//   Browser → 🛡️ Security Guard → Your Route → Database
//
// Before anyone can access protected pages (like dashboard,
// upload notes, etc.), this guard checks:
//   ✅ "Did you send me a user ID?"
//   ✅ "Does that user actually exist in our database?"
//
// If YES → let them through
// If NO  → block them and say "Please login first"
//
// =====================================================

const supabase = require("../config/supabase");

// This function runs BEFORE any protected route
const protect = async (req, res, next) => {

  // --- Step 1: Get the user ID from the request header ---
  // When frontend makes a request, it sends: 
  //   headers: { "user-id": "123" }
  // We read that here:
  const userId = req.headers["user-id"];

  // --- Step 2: Check if user ID was even sent ---
  if (!userId) {
    return res.status(401).json({ 
      message: "Not logged in. Please login first 🔒" 
    });
  }

  try {
    // --- Step 3: Check if this user ID really exists in database ---
    const { data, error } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("id", userId)
      .limit(1);

    if (error || !data || data.length === 0) {
      return res.status(401).json({ 
        message: "Invalid user. Please login again 🔒" 
      });
    }

    // --- Step 4: Attach user info to the request ---
    // Now any route after this can use req.user to know WHO is logged in
    // Example: req.user.id, req.user.username
    req.user = data[0];

    // --- Step 5: Call next() to let the request continue ---
    // Without this line, the request would be stuck here forever!
    next();

  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ message: "Server error 🔒" });
  }
};

module.exports = protect;