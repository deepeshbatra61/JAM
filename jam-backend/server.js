require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { startCronJob } = require("./jobs/syncJob");

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth",         require("./routes/auth"));
app.use("/applications", require("./routes/applications"));
app.use("/sync",         require("./routes/sync"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "JAM Backend", time: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🫙  JAM Backend running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);

  // Start background cron job for auto-syncing Gmail
  startCronJob();
});
