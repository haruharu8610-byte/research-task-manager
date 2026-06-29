-- Run this in the Supabase SQL editor

create table if not exists research_themes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text default '',
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text default '',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  tags text[] default '{}',
  research_theme text default '',
  calendar_event_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- 自習セッション
create table if not exists study_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  duration_minutes integer not null,
  subject text,
  created_at timestamptz default now()
);

alter table study_sessions enable row level security;

create policy "Users can manage their own study sessions"
  on study_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
