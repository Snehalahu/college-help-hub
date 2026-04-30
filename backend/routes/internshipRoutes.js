const express  = require("express");
const router   = express.Router();
const supabase = require("../config/supabase");
const protect  = require("../middleware/authMiddleware");

// =====================================================
// 💼 INTERNSHIP ROUTES — College Help Hub
// =====================================================
//
// ROUTE MAP:
//   POST   /api/internships/add        → Add internship      🔒 Protected
//   GET    /api/internships/all        → Get all             🔓 Public
//   GET    /api/internships/search     → Search/filter       🔓 Public
//   GET    /api/internships/:id        → Get one             🔓 Public
//   DELETE /api/internships/:id        → Delete              🔒 Protected
//
// =====================================================


// ================= ADD INTERNSHIP =================
// 🔒 Protected — only logged-in users can post internships
// URL: POST http://localhost:5000/api/internships/add
router.post("/add", protect, async (req, res) => {
  const { title, company, stipend, apply_link, location, type } = req.body;

  // --- Step 1: Validate required fields ---
  if (!title || !company || !apply_link) {
    return res.status(400).json({ 
      message: "Title, company and apply link are required ❌" 
    });
  }

  // --- Step 2: Validate apply_link is a real URL ---
  // This stops people from entering garbage like "google" instead of "https://google.com"
  try {
    new URL(apply_link); // throws error if not a valid URL
  } catch {
    return res.status(400).json({ message: "Please enter a valid URL for apply link ❌" });
  }

  try {
    const { data, error } = await supabase
      .from("internships")
      .insert([{ 
        title:      title.trim(),
        company:    company.trim(),
        stipend:    stipend || "Unpaid",       // default if not provided
        apply_link: apply_link.trim(),
        location:   location?.trim() || "Remote",  // default to Remote
        type:       type?.trim()     || "Full Time" // default to Full Time
      }])
      .select("id, title, company, stipend, apply_link, location, type, created_at");

    if (error) {
      console.error("Add internship error:", error.message);
      return res.status(500).json({ message: "Could not add internship. Try again ❌" });
    }

    res.status(201).json({ 
      message: "Internship added successfully ✅", 
      data: data[0] 
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= GET ALL INTERNSHIPS =================
// 🔓 Public — anyone can browse internships
// URL: GET http://localhost:5000/api/internships/all
router.get("/all", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("internships")
      .select("*")
      .order("created_at", { ascending: false }); // newest first

    if (error) {
      console.error("Get internships error:", error.message);
      return res.status(500).json({ message: "Could not fetch internships ❌" });
    }

    if (!data || data.length === 0) {
      return res.json({ message: "No internships found yet", data: [] });
    }

    res.json({ 
      message: "Internships fetched ✅", 
      data,
      count: data.length
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= SEARCH / FILTER INTERNSHIPS =================
// 🔓 Public — search by company name or job type
// URL: GET http://localhost:5000/api/internships/search?company=google
// URL: GET http://localhost:5000/api/internships/search?type=Full Time
// URL: GET http://localhost:5000/api/internships/search?q=developer
//
// This is a QUERY PARAMETER — the "?" part in the URL
// Example: /search?company=google  →  finds all Google internships
//
router.get("/search", async (req, res) => {
  // Read what the user is searching for from the URL
  const { q, company, type, location } = req.query;

  try {
    let query = supabase
      .from("internships")
      .select("*")
      .order("created_at", { ascending: false });

    // --- Apply filters only if they were provided ---
    // ilike = case-insensitive LIKE search  (finds "Google", "google", "GOOGLE")
    // % means "anything before or after"
    if (q)        query = query.ilike("title",    `%${q}%`);
    if (company)  query = query.ilike("company",  `%${company}%`);
    if (type)     query = query.eq("type",        type);
    if (location) query = query.ilike("location", `%${location}%`);

    const { data, error } = await query;

    if (error) {
      console.error("Search internships error:", error.message);
      return res.status(500).json({ message: "Search failed ❌" });
    }

    res.json({ 
      message: `Found ${data?.length || 0} internships ✅`, 
      data: data || [] 
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= GET ONE INTERNSHIP =================
// 🔓 Public — get full details of one internship
// URL: GET http://localhost:5000/api/internships/123
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "Invalid internship ID ❌" });
  }

  try {
    const { data, error } = await supabase
      .from("internships")
      .select("*")
      .eq("id", id)
      .limit(1);

    if (error || !data || data.length === 0) {
      return res.status(404).json({ message: "Internship not found ❌" });
    }

    res.json({ message: "Internship fetched ✅", data: data[0] });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= DELETE INTERNSHIP =================
// 🔒 Protected — only logged-in users can delete
// URL: DELETE http://localhost:5000/api/internships/123
router.delete("/:id", protect, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const { data: internship } = await supabase
      .from("internships")
      .select("id")
      .eq("id", id)
      .limit(1);

    if (!internship || internship.length === 0) {
      return res.status(404).json({ message: "Internship not found ❌" });
    }

    const { error } = await supabase
      .from("internships")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete internship error:", error.message);
      return res.status(500).json({ message: "Could not delete internship ❌" });
    }

    res.json({ message: "Internship deleted ✅" });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


module.exports = router;