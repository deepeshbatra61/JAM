const express = require("express");
const router = express.Router();
const supabase = require("../services/supabase");

// ── Auth middleware ───────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("session_token", token)
    .single();

  if (error || !user) return res.status(401).json({ error: "Invalid token" });
  req.user = user;
  next();
}

// ── GET all applications for user ────────────────────────────────────────────
router.get("/", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("applications")
    .select(`
      *,
      timeline_events (id, type, description, date, created_at)
    `)
    .eq("user_id", req.user.id)
    .order("applied_date", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ applications: data });
});

// ── GET single application ────────────────────────────────────────────────────
router.get("/:id", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("applications")
    .select(`*, timeline_events (*)`)
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .single();

  if (error) return res.status(404).json({ error: "Not found" });
  res.json({ application: data });
});

// ── POST create new application ───────────────────────────────────────────────
router.post("/", requireAuth, async (req, res) => {
  const {
    company, role, status = "Applied", source, salary, priority = "Medium",
    url, recruiter_name, recruiter_email, recruiter_phone, notes, applied_date,
  } = req.body;

  if (!company || !role) return res.status(400).json({ error: "company and role are required" });

  const domain = company.toLowerCase().replace(/\s+/g, "") + ".com";

  // Create application
  const { data: app, error } = await supabase
    .from("applications")
    .insert({
      user_id: req.user.id,
      company, role, status, source, salary, priority,
      url, recruiter_name, recruiter_email, recruiter_phone,
      notes, domain, applied_date: applied_date || new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Create initial timeline event
  await supabase.from("timeline_events").insert({
    application_id: app.id,
    type: "applied",
    description: `Applied via ${source || "direct"}`,
    date: app.applied_date,
  });

  res.status(201).json({ application: app });
});

// ── PATCH update application ─────────────────────────────────────────────────
router.patch("/:id", requireAuth, async (req, res) => {
  const allowedFields = [
    "company", "role", "status", "source", "salary", "priority",
    "url", "recruiter_name", "recruiter_email", "recruiter_phone", "notes",
  ];

  const updates = {};
  allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  updates.last_updated = new Date().toISOString();

  const { data, error } = await supabase
    .from("applications")
    .update(updates)
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // If status changed, add timeline event
  if (req.body.status) {
    await supabase.from("timeline_events").insert({
      application_id: req.params.id,
      type: "status",
      description: `Status updated to ${req.body.status}`,
      date: new Date().toISOString().split("T")[0],
    });
  }

  res.json({ application: data });
});

// ── DELETE application ────────────────────────────────────────────────────────
router.delete("/:id", requireAuth, async (req, res) => {
  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── POST add timeline event ───────────────────────────────────────────────────
router.post("/:id/timeline", requireAuth, async (req, res) => {
  const { type = "note", description } = req.body;
  if (!description) return res.status(400).json({ error: "description required" });

  const { data, error } = await supabase
    .from("timeline_events")
    .insert({
      application_id: req.params.id,
      type,
      description,
      date: new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ event: data });
});

// ── GET stats/analytics ───────────────────────────────────────────────────────
router.get("/meta/stats", requireAuth, async (req, res) => {
  const { data: apps, error } = await supabase
    .from("applications")
    .select("status, source, priority, applied_date")
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  const total = apps.length;
  const byStatus = {};
  const bySource = {};
  const byPriority = {};

  apps.forEach((a) => {
    byStatus[a.status]   = (byStatus[a.status]   || 0) + 1;
    bySource[a.source]   = (bySource[a.source]   || 0) + 1;
    byPriority[a.priority] = (byPriority[a.priority] || 0) + 1;
  });

  const responded = total - (byStatus["Applied"] || 0);
  const responseRate = total ? Math.round((responded / total) * 100) : 0;

  res.json({ total, byStatus, bySource, byPriority, responseRate });
});

module.exports = router;
