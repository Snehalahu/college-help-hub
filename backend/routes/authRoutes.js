const express = require("express");
const router  = express.Router();
const supabase = require("../config/supabase");
const bcrypt   = require("bcrypt");

// ================= SIGNUP =================
// Called when user clicks "Signup" button
// URL: POST https://college-help-hub-api.vercel.app/api/auth/register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  // --- Step 1: Validate inputs (don't trust the user!) ---
  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required ❌" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters ❌" });
  }

  try {
    // --- Step 2: Check if email already exists ---
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(400).json({ message: "Email already registered ❌" });
    }

    // --- Step 3: Scramble (hash) the password for safety ---
    // bcrypt turns "mypassword123" into a jumbled string like "$2b$10$xyz..."
    // Even if hackers steal your database, they can't read the real password
    const hashedPassword = await bcrypt.hash(password, 10);

    // --- Step 4: Save new user to Supabase database ---
    const { data, error } = await supabase
      .from("users")
      .insert([{ username, email, password: hashedPassword }])
      .select("id, username, email"); // Only return safe fields (NOT password)

    if (error) {
      console.error("Supabase signup error:", error.message);
      return res.status(500).json({ message: "Signup failed. Try again ❌" });
    }

    // --- Step 5: Send success response ---
    res.status(201).json({
      message: "Account created successfully ✅",
      user: data[0]
    });

  } catch (err) {
    console.error("Signup server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});

// ================= LOGIN =================
// Called when user clicks "Login" button
// URL: POST https://college-help-hub-api.vercel.app/api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // --- Step 1: Validate inputs ---
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required ❌" });
  }

  try {
    // --- Step 2: Find user by email in database ---
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (error) {
      console.error("Supabase login error:", error.message);
      return res.status(500).json({ message: "Server error ❌" });
    }

    // --- Step 3: Check if user exists ---
    if (!data || data.length === 0) {
      // NOTE: We say "Invalid credentials" (not "User not found")
      // This is safer — don't tell hackers which emails exist in your DB
      return res.status(400).json({ message: "Invalid email or password ❌" });
    }

    const user = data[0];

    // --- Step 4: Compare entered password with the scrambled one in DB ---
    // bcrypt.compare("mypassword123", "$2b$10$xyz...") → true or false
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password ❌" });
    }

    // --- Step 5: Send back user info (NEVER send the password back!) ---
    res.json({
      message: "Login successful ✅",
      user: {
        id:       user.id,
        username: user.username,
        email:    user.email
      }
    });

  } catch (err) {
    console.error("Login server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});

module.exports = router;