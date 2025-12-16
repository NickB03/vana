
set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.cleanup_old_artifact_versions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH versions_to_keep AS (
    SELECT id
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY artifact_id
               ORDER BY version_number DESC
             ) as rn
      FROM artifact_versions
    ) t
    WHERE rn <= 20
  )
  DELETE FROM artifact_versions
  WHERE id NOT IN (SELECT id FROM versions_to_keep);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_guest_rate_limits()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM guest_rate_limits
  WHERE last_request_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_artifact_version_atomic(p_message_id uuid, p_artifact_id text, p_artifact_type text, p_artifact_title text, p_artifact_content text, p_artifact_language text, p_content_hash text)
 RETURNS public.artifact_versions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_new_version artifact_versions;
  v_latest_hash TEXT;
BEGIN
  -- Check for duplicate content (skip if hash matches latest)
  SELECT content_hash INTO v_latest_hash
  FROM artifact_versions
  WHERE artifact_id = p_artifact_id
  ORDER BY version_number DESC
  LIMIT 1;

  IF v_latest_hash = p_content_hash THEN
    -- Return existing version (no duplicate needed)
    SELECT * INTO v_new_version
    FROM artifact_versions
    WHERE artifact_id = p_artifact_id
    ORDER BY version_number DESC
    LIMIT 1;

    RETURN v_new_version;
  END IF;

  -- Insert new version with atomic version numbering
  INSERT INTO artifact_versions (
    message_id,
    artifact_id,
    version_number,
    artifact_type,
    artifact_title,
    artifact_content,
    artifact_language,
    content_hash
  )
  VALUES (
    p_message_id,
    p_artifact_id,
    COALESCE(
      (SELECT MAX(version_number) + 1
       FROM artifact_versions
       WHERE artifact_id = p_artifact_id),
      1
    ),
    p_artifact_type,
    p_artifact_title,
    p_artifact_content,
    p_artifact_language,
    p_content_hash
  )
  RETURNING * INTO v_new_version;

  RETURN v_new_version;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_artifact_version_history(p_artifact_id text)
 RETURNS SETOF public.artifact_versions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM artifact_versions
  WHERE artifact_id = p_artifact_id
  ORDER BY version_number DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reload_postgrest_schema_cache()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NOTIFY pgrst, 'reload schema';
  NOTIFY pgrst, 'reload config';
  RAISE NOTICE 'PostgREST schema cache reload requested at %', NOW();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;


  create policy "Users can create versions in own messages"
  on "public"."artifact_versions"
  as permissive
  for insert
  to public
with check ((message_id IN ( SELECT cm.id
   FROM (public.chat_messages cm
     JOIN public.chat_sessions cs ON ((cm.session_id = cs.id)))
  WHERE (cs.user_id = auth.uid()))));



  create policy "Users can view versions from own messages"
  on "public"."artifact_versions"
  as permissive
  for select
  to public
using ((message_id IN ( SELECT cm.id
   FROM (public.chat_messages cm
     JOIN public.chat_sessions cs ON ((cm.session_id = cs.id)))
  WHERE (cs.user_id = auth.uid()))));



  create policy "Chat messages are immutable - no deletes"
  on "public"."chat_messages"
  as permissive
  for delete
  to public
using (false);



  create policy "Chat messages are immutable - no updates"
  on "public"."chat_messages"
  as permissive
  for update
  to public
using (false);



  create policy "Users can insert messages in own sessions"
  on "public"."chat_messages"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));



  create policy "Users can view messages in own sessions"
  on "public"."chat_messages"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));



  create policy "Users can delete own chat sessions"
  on "public"."chat_sessions"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert own chat sessions"
  on "public"."chat_sessions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update own chat sessions"
  on "public"."chat_sessions"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view own chat sessions"
  on "public"."chat_sessions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete own preferences"
  on "public"."user_preferences"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert own preferences"
  on "public"."user_preferences"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update own preferences"
  on "public"."user_preferences"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view own preferences"
  on "public"."user_preferences"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

drop policy "Users can delete their own artifact bundles" on "storage"."objects";

drop policy "Users can update their own artifact bundles" on "storage"."objects";

drop policy "Users can upload artifact bundles for their sessions" on "storage"."objects";

drop policy "Users can view their own artifact bundles" on "storage"."objects";


  create policy "Users can delete own files"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'user-uploads'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid))));



  create policy "Users can delete their own images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'generated-images'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));



  create policy "Users can read own files"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'user-uploads'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid))));



  create policy "Users can read own generated images"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'generated-images'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid))));



  create policy "Users can upload files"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'user-uploads'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid))));



  create policy "Users can upload their own images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'generated-images'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));




Found drop statements in schema diff. Please double check if these are expected:
drop extension if exists "pg_net"                                                                                                                                                                                           
drop trigger if exists "update_chat_sessions_updated_at" on "public"."chat_sessions"                                                                                                                                        
drop trigger if exists "update_user_preferences_updated_at" on "public"."user_preferences"                                                                                                                                  
drop policy "Service role can manage artifact versions" on "public"."artifact_versions"                                                                                                                                     
drop policy "Users can view artifact versions for their sessions" on "public"."artifact_versions"                                                                                                                           
drop policy "allow_insert_own_messages" on "public"."chat_messages"                                                                                                                                                         
drop policy "allow_select_own_messages" on "public"."chat_messages"                                                                                                                                                         
drop policy "service_role_all_messages" on "public"."chat_messages"                                                                                                                                                         
drop policy "allow_delete_own_sessions" on "public"."chat_sessions"                                                                                                                                                         
drop policy "allow_insert_own_sessions" on "public"."chat_sessions"                                                                                                                                                         
drop policy "allow_select_own_sessions" on "public"."chat_sessions"                                                                                                                                                         
drop policy "allow_update_own_sessions" on "public"."chat_sessions"                                                                                                                                                         
drop policy "service_role_all_sessions" on "public"."chat_sessions"                                                                                                                                                         
drop policy "Service role can manage guest rate limits" on "public"."guest_rate_limits"                                                                                                                                     
drop policy "Users can insert their own preferences" on "public"."user_preferences"                                                                                                                                         
drop policy "Users can update their own preferences" on "public"."user_preferences"                                                                                                                                         
drop policy "Users can view their own preferences" on "public"."user_preferences"                                                                                                                                           
alter table "public"."guest_rate_limits" drop constraint "guest_rate_limits_identifier_key"                                                                                                                                 
drop function if exists "public"."update_app_setting"(setting_key text, setting_value jsonb)                                                                                                                                
drop function if exists "public"."update_chat_session_timestamp"()                                                                                                                                                          
drop index if exists "public"."guest_rate_limits_identifier_key"                                                                                                                                                            
drop index if exists "public"."idx_ai_usage_tracking_user_created"                                                                                                                                                          
drop index if exists "public"."idx_artifact_versions_artifact_id"                                                                                                                                                           
drop index if exists "public"."idx_artifact_versions_message_id"                                                                                                                                                            
drop index if exists "public"."idx_artifact_versions_unique"                                                                                                                                                                
drop index if exists "public"."idx_chat_messages_session_created"                                                                                                                                                           
drop index if exists "public"."idx_chat_sessions_updated_at"                                                                                                                                                                
drop index if exists "public"."idx_chat_sessions_user_id_id"                                                                                                                                                                
drop index if exists "public"."idx_chat_sessions_user_updated"                                                                                                                                                              
alter table "public"."chat_messages" alter column "created_at" drop not null                                                                                                                                                
alter table "public"."chat_messages" alter column "token_count" drop default                                                                                                                                                
alter table "public"."chat_sessions" alter column "created_at" drop not null                                                                                                                                                
alter table "public"."chat_sessions" alter column "summary_checkpoint" drop default                                                                                                                                         
alter table "public"."chat_sessions" alter column "updated_at" drop not null                                                                                                                                                
alter table "public"."guest_rate_limits" alter column "created_at" drop not null                                                                                                                                            
alter table "public"."guest_rate_limits" alter column "request_count" drop not null                                                                                                                                         
alter table "public"."user_preferences" alter column "approved_libraries" drop default                                                                                                                                      
CREATE OR REPLACE FUNCTION public.create_artifact_version_atomic(p_message_id uuid, p_artifact_id text, p_artifact_type text, p_artifact_title text, p_artifact_content text, p_artifact_language text, p_content_hash text)
 RETURNS public.artifact_versions                                                                                                                                                                                           
 LANGUAGE plpgsql                                                                                                                                                                                                           
 SECURITY DEFINER                                                                                                                                                                                                           
 SET search_path TO 'public', 'pg_temp'                                                                                                                                                                                     
AS $function$                                                                                                                                                                                                               
DECLARE                                                                                                                                                                                                                     
  v_new_version artifact_versions;                                                                                                                                                                                          
  v_latest_hash TEXT;                                                                                                                                                                                                       
BEGIN                                                                                                                                                                                                                       
  -- Check for duplicate content (skip if hash matches latest)                                                                                                                                                              
  SELECT content_hash INTO v_latest_hash                                                                                                                                                                                    
  FROM artifact_versions                                                                                                                                                                                                    
  WHERE artifact_id = p_artifact_id                                                                                                                                                                                         
  ORDER BY version_number DESC                                                                                                                                                                                              
  LIMIT 1;                                                                                                                                                                                                                  
                                                                                                                                                                                                                            
  IF v_latest_hash = p_content_hash THEN                                                                                                                                                                                    
    -- Return existing version (no duplicate needed)                                                                                                                                                                        
    SELECT * INTO v_new_version                                                                                                                                                                                             
    FROM artifact_versions                                                                                                                                                                                                  
    WHERE artifact_id = p_artifact_id                                                                                                                                                                                       
    ORDER BY version_number DESC                                                                                                                                                                                            
    LIMIT 1;                                                                                                                                                                                                                
                                                                                                                                                                                                                            
    RETURN v_new_version;                                                                                                                                                                                                   
  END IF;                                                                                                                                                                                                                   
                                                                                                                                                                                                                            
  -- Insert new version with atomic version numbering                                                                                                                                                                       
  INSERT INTO artifact_versions (                                                                                                                                                                                           
    message_id,                                                                                                                                                                                                             
    artifact_id,                                                                                                                                                                                                            
    version_number,                                                                                                                                                                                                         
    artifact_type,                                                                                                                                                                                                          
    artifact_title,                                                                                                                                                                                                         
    artifact_content,                                                                                                                                                                                                       
    artifact_language,                                                                                                                                                                                                      
    content_hash                                                                                                                                                                                                            
  )                                                                                                                                                                                                                         
  VALUES (                                                                                                                                                                                                                  
    p_message_id,                                                                                                                                                                                                           
    p_artifact_id,                                                                                                                                                                                                          
    COALESCE(                                                                                                                                                                                                               
      (SELECT MAX(version_number) + 1                                                                                                                                                                                       
       FROM artifact_versions                                                                                                                                                                                               
       WHERE artifact_id = p_artifact_id),                                                                                                                                                                                  
      1                                                                                                                                                                                                                     
    ),                                                                                                                                                                                                                      
    p_artifact_type,                                                                                                                                                                                                        
    p_artifact_title,                                                                                                                                                                                                       
    p_artifact_content,                                                                                                                                                                                                     
    p_artifact_language,                                                                                                                                                                                                    
    p_content_hash                                                                                                                                                                                                          
  )                                                                                                                                                                                                                         
  RETURNING * INTO v_new_version;                                                                                                                                                                                           
                                                                                                                                                                                                                            
  RETURN v_new_version;                                                                                                                                                                                                     
END;                                                                                                                                                                                                                        
$function$                                                                                                                                                                                                                  
;                                                                                                                                                                                                                           
                                                                                                                                                                                                                            
CREATE OR REPLACE FUNCTION public.get_artifact_version_history(p_artifact_id text)                                                                                                                                          
 RETURNS SETOF public.artifact_versions                                                                                                                                                                                     
 LANGUAGE plpgsql                                                                                                                                                                                                           
 SECURITY DEFINER                                                                                                                                                                                                           
 SET search_path TO 'public', 'pg_temp'                                                                                                                                                                                     
AS $function$                                                                                                                                                                                                               
BEGIN                                                                                                                                                                                                                       
  RETURN QUERY                                                                                                                                                                                                              
  SELECT *                                                                                                                                                                                                                  
  FROM artifact_versions                                                                                                                                                                                                    
  WHERE artifact_id = p_artifact_id                                                                                                                                                                                         
  ORDER BY version_number DESC;                                                                                                                                                                                             
END;                                                                                                                                                                                                                        
$function$                                                                                                                                                                                                                  
;                                                                                                                                                                                                                           
                                                                                                                                                                                                                            
CREATE OR REPLACE FUNCTION public.reload_postgrest_schema_cache()                                                                                                                                                           
 RETURNS void                                                                                                                                                                                                               
 LANGUAGE plpgsql                                                                                                                                                                                                           
 SECURITY DEFINER                                                                                                                                                                                                           
 SET search_path TO 'public', 'pg_temp'                                                                                                                                                                                     
AS $function$                                                                                                                                                                                                               
BEGIN                                                                                                                                                                                                                       
  NOTIFY pgrst, 'reload schema';                                                                                                                                                                                            
  NOTIFY pgrst, 'reload config';                                                                                                                                                                                            
  RAISE NOTICE 'PostgREST schema cache reload requested at %', NOW();                                                                                                                                                       
END;                                                                                                                                                                                                                        
$function$                                                                                                                                                                                                                  
;                                                                                                                                                                                                                           
                                                                                                                                                                                                                            
CREATE OR REPLACE FUNCTION public.update_updated_at_column()                                                                                                                                                                
 RETURNS trigger                                                                                                                                                                                                            
 LANGUAGE plpgsql                                                                                                                                                                                                           
AS $function$                                                                                                                                                                                                               
BEGIN                                                                                                                                                                                                                       
  NEW.updated_at = NOW();                                                                                                                                                                                                   
  RETURN NEW;                                                                                                                                                                                                               
END;                                                                                                                                                                                                                        
$function$                                                                                                                                                                                                                  
;                                                                                                                                                                                                                           
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can create versions in own messages"                                                                                                                                                                 
  on "public"."artifact_versions"                                                                                                                                                                                           
  as permissive                                                                                                                                                                                                             
  for insert                                                                                                                                                                                                                
  to public                                                                                                                                                                                                                 
with check ((message_id IN ( SELECT cm.id                                                                                                                                                                                   
   FROM (public.chat_messages cm                                                                                                                                                                                            
     JOIN public.chat_sessions cs ON ((cm.session_id = cs.id)))                                                                                                                                                             
  WHERE (cs.user_id = auth.uid()))));                                                                                                                                                                                       
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can view versions from own messages"                                                                                                                                                                 
  on "public"."artifact_versions"                                                                                                                                                                                           
  as permissive                                                                                                                                                                                                             
  for select                                                                                                                                                                                                                
  to public                                                                                                                                                                                                                 
using ((message_id IN ( SELECT cm.id                                                                                                                                                                                        
   FROM (public.chat_messages cm                                                                                                                                                                                            
     JOIN public.chat_sessions cs ON ((cm.session_id = cs.id)))                                                                                                                                                             
  WHERE (cs.user_id = auth.uid()))));                                                                                                                                                                                       
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Chat messages are immutable - no deletes"                                                                                                                                                                  
  on "public"."chat_messages"                                                                                                                                                                                               
  as permissive                                                                                                                                                                                                             
  for delete                                                                                                                                                                                                                
  to public                                                                                                                                                                                                                 
using (false);                                                                                                                                                                                                              
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Chat messages are immutable - no updates"                                                                                                                                                                  
  on "public"."chat_messages"                                                                                                                                                                                               
  as permissive                                                                                                                                                                                                             
  for update                                                                                                                                                                                                                
  to public                                                                                                                                                                                                                 
using (false);                                                                                                                                                                                                              
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can insert messages in own sessions"                                                                                                                                                                 
  on "public"."chat_messages"                                                                                                                                                                                               
  as permissive                                                                                                                                                                                                             
  for insert                                                                                                                                                                                                                
  to public                                                                                                                                                                                                                 
with check ((EXISTS ( SELECT 1                                                                                                                                                                                              
   FROM public.chat_sessions                                                                                                                                                                                                
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));                                                                                                                        
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can view messages in own sessions"                                                                                                                                                                   
  on "public"."chat_messages"                                                                                                                                                                                               
  as permissive                                                                                                                                                                                                             
  for select                                                                                                                                                                                                                
  to public                                                                                                                                                                                                                 
using ((EXISTS ( SELECT 1                                                                                                                                                                                                   
   FROM public.chat_sessions                                                                                                                                                                                                
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));                                                                                                                        
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can delete own chat sessions"                                                                                                                                                                        
  on "public"."chat_sessions"                                                                                                                                                                                               
  as permissive                                                                                                                                                                                                             
  for delete                                                                                                                                                                                                                
  to public                                                                                                                                                                                                                 
using ((auth.uid() = user_id));                                                                                                                                                                                             
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can insert own chat sessions"                                                                                                                                                                        
  on "public"."chat_sessions"                                                                                                                                                                                               
  as permissive                                                                                                                                                                                                             
  for insert                                                                                                                                                                                                                
  to public                                                                                                                                                                                                                 
with check ((auth.uid() = user_id));                                                                                                                                                                                        
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can update own chat sessions"                                                                                                                                                                        
  on "public"."chat_sessions"                                                                                                                                                                                               
  as permissive                                                                                                                                                                                                             
  for update                                                                                                                                                                                                                
  to public                                                                                                                                                                                                                 
using ((auth.uid() = user_id));                                                                                                                                                                                             
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can view own chat sessions"                                                                                                                                                                          
  on "public"."chat_sessions"                                                                                                                                                                                               
  as permissive                                                                                                                                                                                                             
  for select                                                                                                                                                                                                                
  to public                                                                                                                                                                                                                 
using ((auth.uid() = user_id));                                                                                                                                                                                             
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can delete own preferences"                                                                                                                                                                          
  on "public"."user_preferences"                                                                                                                                                                                            
  as permissive                                                                                                                                                                                                             
  for delete                                                                                                                                                                                                                
  to public                                                                                                                                                                                                                 
using ((auth.uid() = user_id));                                                                                                                                                                                             
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can insert own preferences"                                                                                                                                                                          
  on "public"."user_preferences"                                                                                                                                                                                            
  as permissive                                                                                                                                                                                                             
  for insert                                                                                                                                                                                                                
  to public                                                                                                                                                                                                                 
with check ((auth.uid() = user_id));                                                                                                                                                                                        
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can update own preferences"                                                                                                                                                                          
  on "public"."user_preferences"                                                                                                                                                                                            
  as permissive                                                                                                                                                                                                             
  for update                                                                                                                                                                                                                
  to public                                                                                                                                                                                                                 
using ((auth.uid() = user_id));                                                                                                                                                                                             
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can view own preferences"                                                                                                                                                                            
  on "public"."user_preferences"                                                                                                                                                                                            
  as permissive                                                                                                                                                                                                             
  for select                                                                                                                                                                                                                
  to public                                                                                                                                                                                                                 
using ((auth.uid() = user_id));                                                                                                                                                                                             
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();                                                                       
                                                                                                                                                                                                                            
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();                                                                 
                                                                                                                                                                                                                            
drop policy "Users can delete their own artifact bundles" on "storage"."objects";                                                                                                                                           
                                                                                                                                                                                                                            
drop policy "Users can update their own artifact bundles" on "storage"."objects";                                                                                                                                           
                                                                                                                                                                                                                            
drop policy "Users can upload artifact bundles for their sessions" on "storage"."objects";                                                                                                                                  
                                                                                                                                                                                                                            
drop policy "Users can view their own artifact bundles" on "storage"."objects";                                                                                                                                             
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can delete own files"                                                                                                                                                                                
  on "storage"."objects"                                                                                                                                                                                                    
  as permissive                                                                                                                                                                                                             
  for delete                                                                                                                                                                                                                
  to authenticated                                                                                                                                                                                                          
using (((bucket_id = 'user-uploads'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid))));                                                                                                     
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can delete their own images"                                                                                                                                                                         
  on "storage"."objects"                                                                                                                                                                                                    
  as permissive                                                                                                                                                                                                             
  for delete                                                                                                                                                                                                                
  to authenticated                                                                                                                                                                                                          
using (((bucket_id = 'generated-images'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));                                                                                                 
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can read own files"                                                                                                                                                                                  
  on "storage"."objects"                                                                                                                                                                                                    
  as permissive                                                                                                                                                                                                             
  for select                                                                                                                                                                                                                
  to authenticated                                                                                                                                                                                                          
using (((bucket_id = 'user-uploads'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid))));                                                                                                     
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can read own generated images"                                                                                                                                                                       
  on "storage"."objects"                                                                                                                                                                                                    
  as permissive                                                                                                                                                                                                             
  for select                                                                                                                                                                                                                
  to authenticated                                                                                                                                                                                                          
using (((bucket_id = 'generated-images'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid))));                                                                                                 
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can upload files"                                                                                                                                                                                    
  on "storage"."objects"                                                                                                                                                                                                    
  as permissive                                                                                                                                                                                                             
  for insert                                                                                                                                                                                                                
  to authenticated                                                                                                                                                                                                          
with check (((bucket_id = 'user-uploads'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid))));                                                                                                
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
                                                                                                                                                                                                                            
  create policy "Users can upload their own images"                                                                                                                                                                         
  on "storage"."objects"                                                                                                                                                                                                    
  as permissive                                                                                                                                                                                                             
  for insert                                                                                                                                                                                                                
  to authenticated                                                                                                                                                                                                          
with check (((bucket_id = 'generated-images'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));                                                                                            
nick@Nicks-MacBook-Pro llm-chat-site % 