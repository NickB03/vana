-- Insert a test action to validate schema
insert into public.agent_action_log (
  user_id,
  agent_id,
  project_id,
  action_type,
  summary,
  content,
  embedding
values (
  'demo_user_123',
  'max',
  'demo_project_abc',
  'task',
  'First test action from MaxAgent',
  'Build the initial prompt UI using Lovable components',
  null
);