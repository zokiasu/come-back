-- Keep RLS helper functions outside the exposed public API schema. PostgreSQL
-- policies depend on function OIDs, so ALTER FUNCTION preserves every policy
-- reference while removing the helpers from PostgREST's public RPC surface.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.get_user_role() SET SCHEMA private;
ALTER FUNCTION public.is_admin() SET SCHEMA private;
ALTER FUNCTION public.is_contributor_or_admin() SET SCHEMA private;
ALTER FUNCTION public.is_supabase_or_firebase_project_jwt() SET SCHEMA private;

REVOKE EXECUTE ON FUNCTION private.get_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_contributor_or_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_supabase_or_firebase_project_jwt() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.get_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_contributor_or_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_supabase_or_firebase_project_jwt() TO service_role;

-- The function already checks ownership and the underlying UPDATE is protected
-- by user_ranking_items RLS. INVOKER removes the unnecessary privilege bypass
-- while retaining compatibility with the currently deployed authenticated client.
ALTER FUNCTION public.reorder_ranking_items_atomic(uuid, jsonb) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.reorder_ranking_items_atomic(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_ranking_items_atomic(uuid, jsonb) TO authenticated, service_role;
