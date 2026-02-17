const cron = require("node-cron");
const supabase = require("../services/supabase");
const { runSync } = require("../routes/sync");

// Run every 6 hours: at 00:00, 06:00, 12:00, 18:00
const SCHEDULE = "0 */6 * * *";

function startCronJob() {
  console.log("[Cron] Gmail sync job scheduled — runs every 6 hours");

  cron.schedule(SCHEDULE, async () => {
    console.log(`[Cron] Running scheduled sync at ${new Date().toISOString()}`);

    try {
      // Fetch all users who have a Gmail refresh token
      const { data: users, error } = await supabase
        .from("users")
        .select("id, email, gmail_refresh_token, last_sync_at")
        .not("gmail_refresh_token", "is", null);

      if (error) { console.error("[Cron] Failed to fetch users:", error); return; }
      console.log(`[Cron] Syncing ${users.length} user(s)`);

      // Process users sequentially to avoid rate limit issues
      for (const user of users) {
        try {
          const result = await runSync(user.id, user.gmail_refresh_token, user.last_sync_at);
          console.log(`[Cron] User ${user.email}: created=${result.created}, updated=${result.updated}`);
        } catch (err) {
          console.error(`[Cron] Failed for user ${user.email}:`, err.message);
          // Don't stop the job for one user failure
        }

        // Small delay between users to be polite to Gmail API
        await new Promise((r) => setTimeout(r, 2000));
      }

      console.log("[Cron] Scheduled sync complete");
    } catch (err) {
      console.error("[Cron] Job failed:", err.message);
    }
  });
}

module.exports = { startCronJob };
