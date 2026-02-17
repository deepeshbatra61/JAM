const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");

function getOAuthClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Build a fresh OAuth client with a user's stored refresh token
function getAuthedClient(refreshToken) {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

// Generate the Google OAuth login URL
function getAuthUrl() {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",      // gets us a refresh_token
    prompt: "consent",           // forces refresh_token even if user previously authed
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
  });
}

// Exchange auth code for tokens (called once after user approves)
async function exchangeCodeForTokens(code) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Get basic user info from Google
async function getGoogleUserInfo(accessToken) {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data;
}

// Search Gmail for job-related emails and return raw content
async function fetchJobEmails(refreshToken, afterDate = null) {
  const auth = getAuthedClient(refreshToken);
  const gmail = google.gmail({ version: "v1", auth });

  // Build search query
  let query = [
    "(",
    "subject:(application received)",
    "OR subject:(thank you for applying)",
    "OR subject:(we received your application)",
    "OR subject:(application confirmed)",
    "OR subject:(your application to)",
    "OR subject:(application for)",
    "OR subject:(we'd like to schedule)",
    "OR subject:(interview invitation)",
    "OR subject:(moving forward)",
    "OR subject:(unfortunately)",
    "OR subject:(not moving forward)",
    "OR subject:(offer of employment)",
    ")",
  ].join(" ");

  // Only fetch emails after a given date (for incremental sync)
  if (afterDate) {
    const d = new Date(afterDate);
    const formatted = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
    query += ` after:${formatted}`;
  } else {
    query += " newer_than:90d"; // default: last 90 days on first sync
  }

  // Fetch list of matching message IDs
  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 100,
  });

  if (!listRes.data.messages || listRes.data.messages.length === 0) {
    return [];
  }

  // Fetch full content of each email
  const emails = await Promise.all(
    listRes.data.messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });
      return parseEmailPayload(detail.data);
    })
  );

  return emails.filter(Boolean);
}

// Extract readable text + metadata from Gmail API payload
function parseEmailPayload(message) {
  try {
    const headers = message.payload.headers || [];
    const get = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

    const subject   = get("Subject");
    const from      = get("From");
    const to        = get("To");
    const date      = get("Date");
    const messageId = message.id;
    const threadId  = message.threadId;

    // Extract body text
    let body = "";
    function extractBody(parts) {
      if (!parts) return;
      for (const part of parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          body += Buffer.from(part.body.data, "base64").toString("utf-8");
        } else if (part.parts) {
          extractBody(part.parts);
        }
      }
    }

    if (message.payload.body?.data) {
      body = Buffer.from(message.payload.body.data, "base64").toString("utf-8");
    } else {
      extractBody(message.payload.parts);
    }

    // Trim body to avoid sending huge emails to Claude
    const trimmedBody = body.slice(0, 2000);

    return { subject, from, to, date, body: trimmedBody, messageId, threadId };
  } catch {
    return null;
  }
}

module.exports = { getAuthUrl, exchangeCodeForTokens, getGoogleUserInfo, fetchJobEmails };
