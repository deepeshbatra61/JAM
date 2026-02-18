const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert at parsing job application emails. 
You extract structured data from email content and return ONLY valid JSON with no markdown, no explanation, no extra text.

Rules:
- Extract only what is clearly present in the email. Do not guess or fabricate.
- company: the company name hiring (not a job board). Extract from sender domain or email body.
- role: the exact job title mentioned.
- status: classify based on email content using EXACTLY one of these values:
    "Acknowledged"  → application received/confirmed, no further action
    "Screening"     → recruiter wants to connect, intro call, phone screen
    "Interview"     → interview scheduled or invitation to interview
    "Offer"         → job offer extended
    "Rejected"      → not moving forward, unsuccessful, position filled
  If unclear, return "Acknowledged".
- recruiter_name: full name of the recruiter/sender if mentioned, else null
- recruiter_email: recruiter email if different from sender, else extract from From header, else null
- action_required: one-line string describing what the candidate should do next, or null
- confidence: number 0-1 indicating how confident you are this is a job application email (not spam/newsletter)

Return this exact JSON shape:
{
  "company": "string",
  "role": "string",
  "status": "Acknowledged|Screening|Interview|Offer|Rejected",
  "recruiter_name": "string|null",
  "recruiter_email": "string|null",
  "action_required": "string|null",
  "confidence": 0.0
}`;

async function parseJobEmail(email) {
  const userMessage = `Parse this email and extract job application data:

FROM: ${email.from}
SUBJECT: ${email.subject}
DATE: ${email.date}
BODY:
${email.body}`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001", // fast + cheap for parsing
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content[0].text.trim();
// Strip markdown code fences if present
const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
const parsed = JSON.parse(cleaned);

    // Drop low-confidence results (likely not job emails)
    if (parsed.confidence < 0.6) return null;

    return {
      ...parsed,
      applied_date: extractDateFromEmail(email.date),
      gmail_thread_id: email.threadId,
    };
  } catch (err) {
    console.error("Claude parse error:", err.message);
    return null;
  }
}

// Parse the email date header into YYYY-MM-DD
function extractDateFromEmail(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

// Extract domain from email "From" header like "Sarah <sarah@atlassian.com>"
function extractDomain(fromHeader) {
  const match = fromHeader.match(/@([a-zA-Z0-9.-]+)\./);
  return match ? match[1] : null;
}

module.exports = { parseJobEmail, extractDomain };
