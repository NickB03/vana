-- Optional: view to show 25 most recent agent actions
create or replace view public.view_agent_activity_recent as
select
  id,
  created_at,
  user_id,
  agent_id,
  project_id,
  action_type,
  summary
from public.agent_action_log
order by created_at desc
limit 25;