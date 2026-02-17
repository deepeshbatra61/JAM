# JAM Backend — Deployment Guide
## Railway + Supabase + Google Cloud

---

## STEP 1 — Supabase Setup (5 mins)

1. Go to **supabase.com** → your project → **SQL Editor**
2. Click **New Query**
3. Paste and run this SQL (adds the session_token column needed for auth):

```sql
-- Add session token column to users table
alter table users add column if not exists session_token text;

-- Make sure all tables exist (safe to run even if they do)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  google_id text unique not null,
  email text unique not null,
  name text,
  avatar text,
  gmail_refresh_token text,
  session_token text,
  last_sync_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  company text not null,
  domain text,
  role text not null,
  status text default 'Applied',
  source text,
  salary text,
  priority text default 'Medium',
  url text,
  recruiter_name text,
  recruiter_email text,
  recruiter_phone text,
  notes text,
  gmail_thread_id text,
  applied_date date default current_date,
  last_updated timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists timeline_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete cascade,
  type text not null,
  description text not null,
  date date default current_date,
  created_at timestamptz default now()
);
```

4. Go to **Settings → API** and copy:
   - **Project URL** → this is your SUPABASE_URL
   - **service_role key** (under Project API keys) → this is SUPABASE_SERVICE_KEY

---

## STEP 2 — Google Cloud Console (10 mins)

You said you already have a project. Just make sure:

1. **Gmail API is enabled:**
   - APIs & Services → Enable APIs → search "Gmail API" → Enable

2. **OAuth consent screen is configured:**
   - APIs & Services → OAuth consent screen
   - User Type: External
   - Add scopes: `gmail.readonly`, `userinfo.email`, `userinfo.profile`
   - Add your email as a test user

3. **Get your credentials:**
   - APIs & Services → Credentials → your OAuth 2.0 Client ID
   - Copy **Client ID** and **Client Secret**

4. **Add your Railway callback URL** (you'll get this after Step 3):
   - Authorised redirect URIs → Add:
   `https://YOUR-APP.railway.app/auth/google/callback`
   - Also add for local dev:
   `http://localhost:3000/auth/google/callback`

---

## STEP 3 — Deploy to Railway (5 mins)

1. Go to **railway.app** → New Project → Deploy from GitHub
2. Push the `jam-backend` folder to a GitHub repo first:

```bash
cd jam-backend
git init
git add .
git commit -m "JAM backend initial"
gh repo create jam-backend --public --push
```
(needs GitHub CLI — or just create repo manually and push)

3. In Railway → connect your repo → it auto-detects Node.js

4. Go to **Variables** tab and add all these:

```
SUPABASE_URL              = https://xxxx.supabase.co
SUPABASE_SERVICE_KEY      = eyJh...
GOOGLE_CLIENT_ID          = xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET      = GOCSPX-xxxx
GOOGLE_REDIRECT_URI       = https://YOUR-APP.railway.app/auth/google/callback
ANTHROPIC_API_KEY         = sk-ant-xxxx
FRONTEND_URL              = https://your-nextleap-app-url.com
JWT_SECRET                = any-random-string-min-32-chars
PORT                      = 3000
```

5. Railway auto-deploys. Check **Deployments** tab — should show ✓ in ~2 mins.

6. Copy your Railway URL (e.g. `jam-backend.railway.app`) — this is your API base URL.

---

## STEP 4 — Connect Frontend

1. In your React app (nextleap.app), add the `api.js` file from this package.

2. Create a `.env` file in your React project:
```
VITE_API_URL=https://YOUR-APP.railway.app
```

3. In `App.jsx`, replace mock data calls with API calls:

```javascript
import { api, auth } from './api.js';

// On app load, fetch real data:
useEffect(() => {
  if (auth.isLoggedIn()) {
    api.getApplications().then(setApps);
  }
}, []);

// Login button:
<button onClick={() => window.location.href = auth.loginUrl()}>
  Sign in with Google
</button>

// Sync Gmail button:
async function handleSync() {
  setSyncing(true);
  await api.syncGmail();
  const fresh = await api.getApplications();
  setApps(fresh);
  setSyncing(false);
}

// Add application:
async function handleAdd(formData) {
  const app = await api.createApplication(formData);
  setApps(prev => [app, ...prev]);
}

// Update status:
async function handleStatus(id, status) {
  await api.updateApplication(id, { status });
  setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
}
```

4. Handle the OAuth callback — add a `/auth/success` route in React that reads URL params:

```javascript
// In your router, add this page:
// When Google redirects to /auth/success?token=...&userId=...
const params = new URLSearchParams(window.location.search);
auth.handleCallback(
  params.get('token'),
  params.get('userId'),
  params.get('name'),
  params.get('email'),
  params.get('avatar')
);
window.location.href = '/'; // redirect to dashboard
```

---

## STEP 5 — Test It

1. Visit `https://YOUR-APP.railway.app/health` → should return `{"status":"ok"}`
2. Visit `https://YOUR-APP.railway.app/auth/google` → should redirect to Google login
3. Sign in → should redirect back to your frontend with token
4. Click **Sync Gmail** in the app → watch Railway logs for `[Sync]` output

---

## Local Development

```bash
cd jam-backend
cp .env.example .env
# Fill in your .env values
npm install
npm run dev
```

Server runs on `http://localhost:3000`

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /auth/google | Start OAuth login |
| GET | /auth/google/callback | OAuth callback |
| GET | /auth/me | Get current user |
| POST | /auth/logout | Logout |
| GET | /applications | Get all applications |
| POST | /applications | Create application |
| PATCH | /applications/:id | Update application |
| DELETE | /applications/:id | Delete application |
| POST | /applications/:id/timeline | Add timeline event |
| GET | /applications/meta/stats | Get analytics stats |
| POST | /sync/gmail | Trigger Gmail sync |

---

Questions? The Railway logs tab shows all `[Sync]` and `[Cron]` output in real time.
