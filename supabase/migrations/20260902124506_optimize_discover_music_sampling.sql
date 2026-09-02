-- Pick eligible discovery tracks from a random UUID pivot instead of sorting the
-- whole music catalog with ORDER BY random(). UUID v4 primary keys distribute the
-- pivot across the catalog, while the primary-key scan keeps the work proportional
-- to the requested result size. The wrapped segment handles a pivot near the end.
CREATE OR REPLACE FUNCTION public.get_random_discover_music_ids(count_param integer)
RETURNS TABLE(id uuid)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
WITH params AS MATERIALIZED (
	SELECT
		pg_catalog.gen_random_uuid() AS pivot,
		LEAST(GREATEST(COALESCE(count_param, 0), 0), 60)::integer AS requested
),
forward AS MATERIALIZED (
	SELECT m.id
	FROM public.musics AS m
	JOIN LATERAL (
		SELECT 1
		FROM public.music_artists AS ma
		JOIN public.artists AS a ON a.id = ma.artist_id
		WHERE ma.music_id = m.id
			AND a.verified IS TRUE
		LIMIT 1
	) AS verified_artist ON TRUE
	JOIN LATERAL (
		SELECT 1
		FROM public.music_releases AS mr
		JOIN public.releases AS r ON r.id = mr.release_id
		WHERE mr.music_id = m.id
			AND r.verified IS TRUE
		LIMIT 1
	) AS verified_release ON TRUE
	WHERE m.id >= (SELECT pivot FROM params)
		AND m.verified IS TRUE
		AND m.id_youtube_music IS NOT NULL
		AND m.name NOT ILIKE '%Inst.%'
		AND m.name NOT ILIKE '%Instrumental%'
		AND m.name NOT ILIKE '%Sped Up%'
		AND m.name NOT ILIKE '%(live)%'
		AND m.name NOT ILIKE '%[live]%'
		AND m.name NOT ILIKE '% - Live%'
	ORDER BY m.id
	LIMIT (SELECT requested FROM params)
),
wrapped AS (
	SELECT m.id
	FROM public.musics AS m
	JOIN LATERAL (
		SELECT 1
		FROM public.music_artists AS ma
		JOIN public.artists AS a ON a.id = ma.artist_id
		WHERE ma.music_id = m.id
			AND a.verified IS TRUE
		LIMIT 1
	) AS verified_artist ON TRUE
	JOIN LATERAL (
		SELECT 1
		FROM public.music_releases AS mr
		JOIN public.releases AS r ON r.id = mr.release_id
		WHERE mr.music_id = m.id
			AND r.verified IS TRUE
		LIMIT 1
	) AS verified_release ON TRUE
	WHERE m.id < (SELECT pivot FROM params)
		AND m.verified IS TRUE
		AND m.id_youtube_music IS NOT NULL
		AND m.name NOT ILIKE '%Inst.%'
		AND m.name NOT ILIKE '%Instrumental%'
		AND m.name NOT ILIKE '%Sped Up%'
		AND m.name NOT ILIKE '%(live)%'
		AND m.name NOT ILIKE '%[live]%'
		AND m.name NOT ILIKE '% - Live%'
	ORDER BY m.id
	LIMIT (
		SELECT GREATEST(requested - (SELECT COUNT(*)::integer FROM forward), 0)
		FROM params
	)
)
SELECT picked.id
FROM (
	SELECT f.id, 0 AS segment FROM forward AS f
	UNION ALL
	SELECT w.id, 1 AS segment FROM wrapped AS w
) AS picked
ORDER BY picked.segment, picked.id;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_random_discover_music_ids(integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_random_discover_music_ids(integer)
TO service_role;
