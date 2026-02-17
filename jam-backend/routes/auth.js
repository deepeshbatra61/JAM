const express = require("express");
const router = express.Router();
const { getAuthUrl, exchangeCodeForTokens, getGoogleUserInfo } = require("../services/gmail");
const supabase = require("../services/supabase");
const crypto = require("crypto");

// ── Step 1: Redirect user to Google login ────────────────────────────────────
router.get("/google", (req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

// ── Step 2: Google redirects back here with a code ───────────────────────────
router.get("/google/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${process.env.FRONTEND_URL}?auth=error`);
  }

  try {
    // Exchange code for access + refresh tokens
    const tokens = await exchangeCodeForTokens(code);
    const userInfo = await getGoogleUserInfo(tokens.access_token);

    // Upsert user in Supabase
    const { data: user, error: dbError } = await supabase
      .from("users")
      .upsert(
        {
          google_id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          avatar: userInfo.picture,
          gmail_refresh_token: tokens.refresh_token,
        },
        { onConflict: "google_id", ignoreDuplicates: false }
      )
      .select()
      .single();

    if (dbError) throw dbError;

    // Create a simple session token (in production use JWT or proper sessions)
    const sessionToken = crypto.randomBytes(32).toString("hex");

    // Store session token in Supabase
    await supabase
      .from("users")
      .update({ session_token: sessionToken })
      .eq("id", user.id);

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${sessionToken}&userId=${user.id}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&avatar=${encodeURIComponent(user.avatar||"")}`);
  } catch (err) {
    console.error("Auth callback error:", err);
    res.redirect(`${process.env.FRONTEND_URL}?auth=error`);
  }
});

// ── Get current user (used by frontend on load) ───────────────────────────────
router.get("/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });

  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, name, avatar, last_sync_at")
    .eq("session_token", token)
    .single();

  if (error || !user) return res.status(401).json({ error: "Invalid token" });
  res.json({ user });
});

// ── Logout ───────────────────────────────────────────────────────────────────
router.post("/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    await supabase
      .from("users")
      .update({ session_token: null })
      .eq("session_token", token);
  }
  res.json({ ok: true });
});

module.exports = router;
