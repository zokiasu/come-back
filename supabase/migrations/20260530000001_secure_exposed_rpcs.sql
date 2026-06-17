-- Lock down SECURITY DEFINER functions that were executable by anon/authenticated
-- via PostgREST, bypassing the API-layer authorization.
--
-- Findings (verified against pg_proc ACLs + real call sites):
--   * delete_artist_safely / delete_artist_simple / analyze_artist_deletion_impact
--     are only ever called server-side (service-role endpoints guarded by
--     requireAdmin/requireContributor). Their client wrappers are dead code.
--     => revoke from public/anon/authenticated, keep service_role.
--   * get_top_contributors (leaked user emails) and get_contributions_stats are
--     not called anywhere. => revoke from public/anon/authenticated.
--   * reorder_ranking_items_atomic is genuinely called client-side (a user
--     reordering their own ranking) but had NO ownership check, so any
--     authenticated user could reorder any ranking. => add an owner guard
--     (auth.uid() must own the ranking) and revoke anon.

-- ---------------------------------------------------------------------------
-- Server-only / unused functions: revoke from everyone except service_role.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.delete_artist_safely(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.delete_artist_safely(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_artist_simple(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.delete_artist_simple(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.analyze_artist_deletion_impact(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.analyze_artist_deletion_impact(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_top_contributors(integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_top_contributors(integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_contributions_stats() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_contributions_stats() TO service_role;

-- ---------------------------------------------------------------------------
-- reorder_ranking_items_atomic: add an ownership guard (the function is only
-- ever invoked by the authenticated owner from the client). Body is otherwise
-- unchanged from the original.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reorder_ranking_items_atomic(p_ranking_id uuid, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
	item jsonb;
	item_id uuid;
	item_position int;
BEGIN
	-- Only the owner of the ranking may reorder its items.
	IF NOT EXISTS (
		SELECT 1 FROM public.user_rankings
		WHERE id = p_ranking_id AND user_id = auth.uid()
	) THEN
		RAISE EXCEPTION 'Not authorized to reorder this ranking'
			USING ERRCODE = 'insufficient_privilege';
	END IF;

	-- First pass: set all positions to negative values to avoid UNIQUE conflicts
	FOR item IN SELECT * FROM jsonb_array_elements(p_items)
	LOOP
		item_id := (item->>'id')::uuid;
		item_position := (item->>'position')::int;

		UPDATE user_ranking_items
		SET position = -item_position
		WHERE id = item_id AND ranking_id = p_ranking_id;
	END LOOP;

	-- Second pass: set all positions to their final positive values
	FOR item IN SELECT * FROM jsonb_array_elements(p_items)
	LOOP
		item_id := (item->>'id')::uuid;
		item_position := (item->>'position')::int;

		UPDATE user_ranking_items
		SET position = item_position
		WHERE id = item_id AND ranking_id = p_ranking_id;
	END LOOP;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.reorder_ranking_items_atomic(uuid, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reorder_ranking_items_atomic(uuid, jsonb) TO authenticated, service_role;
