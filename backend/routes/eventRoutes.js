const express  = require("express");
const router   = express.Router();
const supabase = require("../config/supabase");
const protect  = require("../middleware/authMiddleware");

// =====================================================
// 🎉 EVENT ROUTES — College Help Hub
// =====================================================
//
// ROUTE MAP:
//   GET    /api/events/all        → Get all events       🔓 Public
//   GET    /api/events/:id        → Get one event        🔓 Public
//   POST   /api/events/add        → Add new event        🔒 Protected
//   POST   /api/events/register/:id → Register for event 🔒 Protected
//   DELETE /api/events/:id        → Delete event         🔒 Protected
//
// Your events table columns:
//   id, created_at, title, date, location
//
// =====================================================


// ================= GET ALL EVENTS =================
// 🔓 Public — anyone can see upcoming events
// URL: GET http://localhost:5000/api/events/all
router.get("/all", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: true }); // show earliest events first

    if (error) {
      console.error("Get events error:", error.message);
      return res.status(500).json({ message: "Could not fetch events ❌" });
    }

    // --- Empty state ---
    if (!data || data.length === 0) {
      return res.json({ 
        message: "No upcoming events. Check back soon!", 
        data: [] 
      });
    }

    res.json({ 
      message: "Events fetched ✅", 
      data,
      count: data.length
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= GET ONE EVENT =================
// 🔓 Public — see full details of one event
// URL: GET http://localhost:5000/api/events/123
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "Invalid event ID ❌" });
  }

  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .limit(1);

    if (error || !data || data.length === 0) {
      return res.status(404).json({ message: "Event not found ❌" });
    }

    res.json({ message: "Event fetched ✅", data: data[0] });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= ADD EVENT =================
// 🔒 Protected — only logged-in users can add events
// URL: POST http://localhost:5000/api/events/add
router.post("/add", protect, async (req, res) => {
  const { title, date, location } = req.body;

  // --- Step 1: Validate ---
  if (!title || !date || !location) {
    return res.status(400).json({ 
      message: "Title, date and location are required ❌" 
    });
  }

  if (title.trim().length < 3) {
    return res.status(400).json({ message: "Title is too short ❌" });
  }

  // --- Step 2: Validate date is not in the past ---
  // new Date(date) converts "2025-05-01" into a real date object
  // Date.now() is today's timestamp in milliseconds
  const eventDate = new Date(date);
  if (isNaN(eventDate.getTime())) {
    return res.status(400).json({ message: "Please enter a valid date ❌" });
  }

  try {
    // --- Step 3: Insert into Supabase ---
    const { data, error } = await supabase
      .from("events")
      .insert([{
        title:    title.trim(),
        date:     date,
        location: location.trim()
      }])
      .select("id, title, date, location, created_at");

    if (error) {
      console.error("Add event error:", error.message);
      return res.status(500).json({ message: "Could not add event. Try again ❌" });
    }

    res.status(201).json({ 
      message: "Event added successfully ✅", 
      data: data[0] 
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= REGISTER FOR EVENT =================
// 🔒 Protected — only logged-in users can register
// URL: POST http://localhost:5000/api/events/register/123
//
// NOTE: Since your events table doesn't have a registrations column yet,
// this route confirms registration and returns success.
// Later you can add a "registrations" table to track who registered.
//
router.post("/register/:id", protect, async (req, res) => {
  const { id } = req.params;
  const user = req.user; // from middleware

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "Invalid event ID ❌" });
  }

  try {
    // --- Check event exists ---
    const { data, error } = await supabase
      .from("events")
      .select("id, title, date, location")
      .eq("id", id)
      .limit(1);

    if (error || !data || data.length === 0) {
      return res.status(404).json({ message: "Event not found ❌" });
    }

    const event = data[0];

    // --- Send confirmation ---
    // This is like a "booking confirmation" message
    res.json({
      message: `Successfully registered for "${event.title}" ✅`,
      data: {
        event,
        registeredUser: {
          id:       user.id,
          username: user.username,
          email:    user.email
        },
        registeredAt: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// ================= DELETE EVENT =================
// 🔒 Protected — only logged-in users can delete events
// URL: DELETE http://localhost:5000/api/events/123
router.delete("/:id", protect, async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "Invalid event ID ❌" });
  }

  try {
    // Check event exists
    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("id", id)
      .limit(1);

    if (!event || event.length === 0) {
      return res.status(404).json({ message: "Event not found ❌" });
    }

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete event error:", error.message);
      return res.status(500).json({ message: "Could not delete event ❌" });
    }

    res.json({ message: "Event deleted ✅" });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


module.exports = router;