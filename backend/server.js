require('dotenv').config(); // ← ADD THIS as very first line!

const express = require("express");
const cors    = require("cors");
// rest of your code...

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// ================= ROUTES =================
app.use("/api/auth",        require("./routes/authRoutes"));
app.use("/api/notes",       require("./routes/notesRoutes"));
app.use("/api/internships", require("./routes/internshipRoutes"));
app.use("/api/doubts",      require("./routes/doubtRoutes"));
app.use("/api/answers",     require("./routes/answerRoutes"));
app.use("/api/dashboard",   require("./routes/dashboardRoutes"));
app.use("/api/events",      require("./routes/eventRoutes"));

// ================= TEST ROUTE =================
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// ================= START =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server started on http://localhost:${PORT}`);
});