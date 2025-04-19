-- Enable pgvector if not already enabled
create extension if not exists vector;

-- Create table for agent memory actions
create table if not exists public.agent_action_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  user_id text not null,
  agent_id text not null,
  project_id text,
  action_type text not null,
  summary text,
  content text,
  embedding vector(1536)
);

-- Optional: future RLS policies go here