const express = require("express");
const router = express.Router();
const supabase = require("../services/supabase");
const { fetchJobEmails } = require("../services/gmail");
const { parseJobEmail, extractDomain } = require("../services/claude");

// ── Auth middleware ───────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: user } = await supabase
    .from("users")
    .select("id, email, gmail_refresh_token, last_sync_at")
    .eq("session_token", token)
    .single();

  if (!user) return res.status(401).json({ error: "Invalid token" });
  req.user = user;
  next();
}

// ── POST /sync/gmail — trigger manual sync ────────────────────────────────────
router.post("/gmail", requireAuth, async (req, res) => {
  const { gmail_refresh_token, last_sync_at } = req.user;

  if (!gmail_refresh_token) {
    return res.status(400).json({ error: "Gmail not connected. Please re-authenticate." });
  }

  res.json({ message: "Sync started", status: "processing" });

  // Run sync in background (don't block the response)
  runSync(req.user.id, gmail_refresh_token, last_sync_at).catch(console.error);
});

// ── Core sync function (also used by cron job) ────────────────────────────────
async function runSync(userId, refreshToken, lastSyncAt) {
  console.log(`[Sync] Starting for user ${userId}`);

  try {
    // Fetch emails since last sync (or last 90 days on first sync)
    const emails = await fetchJobEmails(refreshToken, lastSyncAt);
    console.log(`[Sync] Found ${emails.length} emails to process`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const email of emails) {
  // Parse with Claude
  const parsed = await parseJobEmail(email);
  console.log("[Sync] parseJobEmail returned:", parsed); // ADD THIS
  if (!parsed) { 
    console.log("[Sync] Skipping - parseJobEmail returned null"); // ADD THIS
    skipped++; 
    continue; 
  }

const domain = extractDomain(email.from) || parsed.company.toLowerCase().replace(/\s+/g, "") + ".com";
      console.log(`[Sync] ${parsed.company}: Extracted domain = ${domain}, from = ${email.from}`);
      
      // Check if application already exists (match by company domain + user)
      const { data: existing } = await supabase
        .from("applications")
        .select("id, status")
        .eq("user_id", userId)
        .ilike("domain", `%${domain}%`)
        .maybeSingle();
      
      console.log(`[Sync] ${parsed.company}: Found existing?`, existing);
      
      if (existing) {
        // Update status if the new status is further along the pipeline
        const statusOrder = { Applied:0, Acknowledged:1, Screening:2, Interview:3, Offer:4, Rejected:5 };
        const currentOrder = statusOrder[existing.status] || 0;
        const newOrder     = statusOrder[parsed.status]   || 0;

        if (newOrder > currentOrder) {
          await supabase
            .from("applications")
            .update({ status: parsed.status, last_updated: new Date().toISOString() })
            .eq("id", existing.id);

          await supabase.from("timeline_events").insert({
            application_id: existing.id,
            type: "email",
            description: `${parsed.status} — auto-detected from email: "${email.subject}"`,
            date: parsed.applied_date,
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Create new application
        const { data: app, error } = await supabase
          .from("applications")
          .insert({
            user_id: userId,
            company: parsed.company,
            role: parsed.role,
            status: parsed.status,
            domain,
            recruiter_name: parsed.recruiter_name,
            recruiter_email: parsed.recruiter_email,
            gmail_thread_id: email.threadId,
            applied_date: parsed.applied_date,
          })
          .select()
          .single();

        if (!error && app) {
          await supabase.from("timeline_events").insert({
            application_id: app.id,
            type: "email",
            description: `Auto-imported: "${email.subject}"`,
            date: parsed.applied_date,
          });
          created++;
        }
      }
    }

    // Update last sync time
    await supabase
      .from("users")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", userId);

    console.log(`[Sync] Done — created: ${created}, updated: ${updated}, skipped: ${skipped}`);
    return { created, updated, skipped };
  } catch (err) {
    console.error(`[Sync] Error for user ${userId}:`, err.message);
    throw err;
  }
}

module.exports = router;
module.exports.runSync = runSync;
