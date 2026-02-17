const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabase;

/*
──────────────────────────────────────────────────────────────────────────────
  SUPABASE SCHEMA — Run these SQL statements in your Supabase SQL editor
  Dashboard → SQL Editor → New Query → paste and run
──────────────────────────────────────────────────────────────────────────────

-- USERS TABLE
create table users (
  id uuid primary key default gen_random_uuid(),
  google_id text unique not null,
  email text unique not null,
  name text,
  avatar text,
  gmail_refresh_token text,
  last_sync_at timestamptz,
  created_at timestamptz default now()
);

-- APPLICATIONS TABLE
create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  company text not null,
  domain text,
  role text not null,
  status text default 'Applied'
    check (status in ('Applied','Acknowledged','Screening','Interview','Offer','Rejected')),
  source text,
  salary text,
  priority text default 'Medium'
    check (priority in ('Dream Job','High','Medium','Backup')),
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

-- TIMELINE EVENTS TABLE
create table timeline_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete cascade,
  type text not null,
  description text not null,
  date date default current_date,
  created_at timestamptz default now()
);

-- Row Level Security (protect user data)
alter table users          enable row level security;
alter table applications   enable row level security;
alter table timeline_events enable row level security;

-- Service role bypasses RLS automatically (your backend uses service key)
-- So no additional policies needed for backend access.

──────────────────────────────────────────────────────────────────────────────
*/
