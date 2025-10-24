-- Phase 7: User preferences table for library approval settings
create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  auto_approve_libraries boolean default false,
  approved_libraries jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.user_preferences enable row level security;

-- Users can view their own preferences
create policy "Users can view their own preferences"
on public.user_preferences
for select
to authenticated
using (auth.uid() = user_id);

-- Users can insert their own preferences
create policy "Users can insert their own preferences"
on public.user_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

-- Users can update their own preferences
create policy "Users can update their own preferences"
on public.user_preferences
for update
to authenticated
using (auth.uid() = user_id);

-- Trigger for updated_at
create trigger update_user_preferences_updated_at
before update on public.user_preferences
for each row
execute function public.update_chat_session_timestamp();