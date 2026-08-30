-- Version aligned with the migration recorded by the linked Supabase project.
BEGIN;

CREATE OR REPLACE FUNCTION public.reorder_ranking_items_server(
	p_ranking_id uuid,
	p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
	item jsonb;
	item_count integer;
	item_id uuid;
	item_position integer;
BEGIN
	IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
		RAISE EXCEPTION 'Ranking items must be a JSON array'
			USING ERRCODE = 'invalid_parameter_value';
	END IF;

	item_count := jsonb_array_length(p_items);
	IF item_count < 1 OR item_count > 100 THEN
		RAISE EXCEPTION 'A ranking reorder must contain between 1 and 100 items'
			USING ERRCODE = 'invalid_parameter_value';
	END IF;

	IF (
		SELECT count(DISTINCT value->>'id') <> item_count
			OR count(DISTINCT (value->>'position')::integer) <> item_count
		FROM jsonb_array_elements(p_items)
	) THEN
		RAISE EXCEPTION 'Ranking item IDs and positions must be unique'
			USING ERRCODE = 'invalid_parameter_value';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM jsonb_array_elements(p_items) AS requested(value)
		LEFT JOIN public.user_ranking_items existing
			ON existing.id = (requested.value->>'id')::uuid
			AND existing.ranking_id = p_ranking_id
		WHERE existing.id IS NULL
	) THEN
		RAISE EXCEPTION 'Every item must belong to the requested ranking'
			USING ERRCODE = 'invalid_parameter_value';
	END IF;

	FOR item IN SELECT value FROM jsonb_array_elements(p_items)
	LOOP
		item_id := (item->>'id')::uuid;
		item_position := (item->>'position')::integer;
		IF item_position < 1 OR item_position > 100 THEN
			RAISE EXCEPTION 'Ranking positions must be between 1 and 100'
				USING ERRCODE = 'invalid_parameter_value';
		END IF;

		UPDATE public.user_ranking_items
		SET position = -item_position
		WHERE id = item_id AND ranking_id = p_ranking_id;
	END LOOP;

	FOR item IN SELECT value FROM jsonb_array_elements(p_items)
	LOOP
		UPDATE public.user_ranking_items
		SET position = (item->>'position')::integer
		WHERE id = (item->>'id')::uuid AND ranking_id = p_ranking_id;
	END LOOP;

	UPDATE public.user_rankings
	SET updated_at = now()
	WHERE id = p_ranking_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.reorder_ranking_items_server(uuid, jsonb)
	FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_ranking_items_server(uuid, jsonb)
	TO service_role;

COMMIT;
