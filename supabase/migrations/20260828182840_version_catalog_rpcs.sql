-- Version the catalog/statistics RPCs that previously existed only in production.
-- Every function below is called through a guarded server endpoint, so direct
-- PostgREST execution is restricted to service_role.

CREATE OR REPLACE FUNCTION public.get_random_music_ids(count_param integer)
RETURNS TABLE(id uuid)
LANGUAGE sql
SET search_path = public
AS $$
	SELECT m.id
	FROM public.musics m
	ORDER BY random()
	LIMIT GREATEST(count_param, 0)
$$;

CREATE OR REPLACE FUNCTION public.get_random_music_ids_by_artist(
	artist_id_param uuid,
	count_param integer
)
RETURNS TABLE(id uuid)
LANGUAGE sql
SET search_path = public
AS $$
	SELECT m.id
	FROM public.musics m
	JOIN public.music_artists ma ON ma.music_id = m.id
	WHERE ma.artist_id = artist_id_param
	ORDER BY random()
	LIMIT GREATEST(count_param, 0)
$$;

CREATE OR REPLACE FUNCTION public.search_artists_fulltext(
	search_query text,
	result_limit integer DEFAULT 10,
	artist_type text DEFAULT NULL
)
RETURNS TABLE(
	id uuid,
	name varchar,
	description text,
	type varchar,
	image varchar,
	gender varchar,
	birth_date timestamptz,
	debut_date timestamptz,
	active_career boolean,
	verified boolean,
	id_youtube_music varchar,
	styles text[],
	general_tags text[],
	created_at timestamptz,
	updated_at timestamptz,
	social_links jsonb,
	platform_links jsonb,
	companies jsonb
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
	RETURN QUERY
	SELECT
		a.id,
		a.name,
		a.description,
		a.type::varchar(50),
		a.image,
		a.gender::varchar(50),
		a.birth_date,
		a.debut_date,
		a.active_career,
		a.verified,
		a.id_youtube_music,
		a.styles,
		a.general_tags,
		a.created_at,
		a.updated_at,
		COALESCE(
			(SELECT jsonb_agg(row_to_json(sl.*))
			 FROM public.artist_social_links sl WHERE sl.artist_id = a.id),
			'[]'::jsonb
		),
		COALESCE(
			(SELECT jsonb_agg(row_to_json(pl.*))
			 FROM public.artist_platform_links pl WHERE pl.artist_id = a.id),
			'[]'::jsonb
		),
		COALESCE(
			(SELECT jsonb_agg(jsonb_build_object(
				'id', ac.id,
				'artist_id', ac.artist_id,
				'company_id', ac.company_id,
				'relationship_type', ac.relationship_type,
				'start_date', ac.start_date,
				'end_date', ac.end_date,
				'is_current', ac.is_current,
				'company', row_to_json(c.*)
			))
			 FROM public.artist_companies ac
			 LEFT JOIN public.companies c ON c.id = ac.company_id
			 WHERE ac.artist_id = a.id),
			'[]'::jsonb
		)
	FROM public.artists a
	WHERE a.verified IS TRUE
		AND (search_query IS NULL OR search_query = '' OR a.name ILIKE '%' || search_query || '%')
		AND (artist_type IS NULL OR a.type::text = artist_type)
		AND a.id_youtube_music IS NOT NULL
	ORDER BY
		CASE
			WHEN a.name ILIKE search_query || '%' THEN 1
			WHEN a.name ILIKE '%' || search_query || '%' THEN 2
			ELSE 3
		END,
		a.name
	LIMIT LEAST(GREATEST(result_limit, 0), 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_general_stats(
	filter_year integer DEFAULT NULL,
	start_date date DEFAULT NULL,
	end_date date DEFAULT NULL
)
RETURNS TABLE(
	total_artists bigint,
	total_releases bigint,
	total_musics bigint,
	total_companies bigint,
	active_artists bigint,
	inactive_artists bigint
)
LANGUAGE sql
SET search_path = public
AS $$
	SELECT
		(SELECT count(*) FROM public.artists)::bigint,
		(SELECT count(*) FROM public.releases r
		 WHERE (filter_year IS NULL OR extract(year FROM r.date) = filter_year)
			AND (start_date IS NULL OR r.date >= start_date)
			AND (end_date IS NULL OR r.date <= end_date))::bigint,
		(SELECT count(*) FROM public.musics m
		 WHERE (filter_year IS NULL OR m.release_year = filter_year)
			AND (start_date IS NULL OR m.date >= start_date)
			AND (end_date IS NULL OR m.date <= end_date))::bigint,
		(SELECT count(*) FROM public.companies)::bigint,
		(SELECT count(*) FROM public.artists WHERE active_career IS TRUE)::bigint,
		(SELECT count(*) FROM public.artists WHERE active_career IS FALSE OR active_career IS NULL)::bigint
$$;

CREATE OR REPLACE FUNCTION public.get_artist_demographics()
RETURNS TABLE(stat_type varchar, category varchar, count_value bigint)
LANGUAGE sql
SET search_path = public
AS $$
	SELECT 'type'::varchar(20), COALESCE(type::varchar(50), 'UNKNOWN'), count(*)::bigint
	FROM public.artists GROUP BY type
	UNION ALL
	SELECT 'gender'::varchar(20), COALESCE(gender::varchar(50), 'UNKNOWN'), count(*)::bigint
	FROM public.artists GROUP BY gender
	UNION ALL
	SELECT 'status'::varchar(20),
		CASE WHEN active_career IS TRUE THEN 'Actif' ELSE 'Inactif' END::varchar(50),
		count(*)::bigint
	FROM public.artists GROUP BY active_career
$$;

CREATE OR REPLACE FUNCTION public.get_top_artists_by_musics(
	filter_year integer DEFAULT NULL,
	start_date date DEFAULT NULL,
	end_date date DEFAULT NULL,
	limit_count integer DEFAULT 10
)
RETURNS TABLE(artist_id uuid, artist_name varchar, music_count bigint)
LANGUAGE sql
SET search_path = public
AS $$
	SELECT a.id, a.name, count(DISTINCT m.id)::bigint
	FROM public.artists a
	JOIN public.music_artists ma ON ma.artist_id = a.id
	JOIN public.musics m ON m.id = ma.music_id
	WHERE (filter_year IS NULL OR m.release_year = filter_year)
		AND (start_date IS NULL OR m.date >= start_date)
		AND (end_date IS NULL OR m.date <= end_date)
		AND (m.date IS NOT NULL OR m.release_year IS NOT NULL)
	GROUP BY a.id, a.name
	HAVING count(DISTINCT m.id) > 0
	ORDER BY count(DISTINCT m.id) DESC
	LIMIT LEAST(GREATEST(limit_count, 0), 100)
$$;

CREATE OR REPLACE FUNCTION public.get_top_artists_by_releases(
	filter_year integer DEFAULT NULL,
	start_date date DEFAULT NULL,
	end_date date DEFAULT NULL,
	limit_count integer DEFAULT 10
)
RETURNS TABLE(artist_id uuid, artist_name varchar, release_count bigint)
LANGUAGE sql
SET search_path = public
AS $$
	SELECT a.id, a.name, count(DISTINCT r.id)::bigint
	FROM public.artists a
	JOIN public.artist_releases ar ON ar.artist_id = a.id
	JOIN public.releases r ON r.id = ar.release_id
	WHERE (filter_year IS NULL OR extract(year FROM r.date) = filter_year)
		AND (start_date IS NULL OR r.date >= start_date)
		AND (end_date IS NULL OR r.date <= end_date)
		AND r.date IS NOT NULL
	GROUP BY a.id, a.name
	HAVING count(DISTINCT r.id) > 0
	ORDER BY count(DISTINCT r.id) DESC
	LIMIT LEAST(GREATEST(limit_count, 0), 100)
$$;

CREATE OR REPLACE FUNCTION public.get_releases_temporal_stats(
	period_type varchar DEFAULT 'month',
	filter_year integer DEFAULT NULL,
	filter_month integer DEFAULT NULL
)
RETURNS TABLE(period_label text, period_date date, count_value bigint)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
	IF period_type = 'day' THEN
		RETURN QUERY
		SELECT to_char(r.date, 'DD/MM'), r.date::date, count(*)::bigint
		FROM public.releases r
		WHERE r.date IS NOT NULL
			AND (filter_year IS NULL OR extract(year FROM r.date) = filter_year)
			AND (filter_month IS NULL OR extract(month FROM r.date) = filter_month + 1)
		GROUP BY r.date
		ORDER BY r.date::date;
	ELSE
		RETURN QUERY
		SELECT to_char(date_trunc('month', r.date), 'MM/YYYY'),
			date_trunc('month', r.date)::date, count(*)::bigint
		FROM public.releases r
		WHERE r.date IS NOT NULL
			AND (filter_year IS NULL OR extract(year FROM r.date) = filter_year)
		GROUP BY date_trunc('month', r.date)
		ORDER BY date_trunc('month', r.date)::date;
	END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_musics_temporal_stats_with_fallback(
	period_type varchar DEFAULT 'month',
	filter_year integer DEFAULT NULL,
	filter_month integer DEFAULT NULL
)
RETURNS TABLE(period_label text, period_date date, count_value bigint)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
	IF period_type = 'day' THEN
		RETURN QUERY
		SELECT to_char(m.date, 'DD/MM'), m.date::date, count(*)::bigint
		FROM public.musics m
		WHERE m.date IS NOT NULL
			AND (filter_year IS NULL OR extract(year FROM m.date) = filter_year)
			AND (filter_month IS NULL OR extract(month FROM m.date) = filter_month + 1)
		GROUP BY m.date
		ORDER BY m.date::date;
	ELSE
		RETURN QUERY
		SELECT
			CASE WHEN m.date IS NOT NULL
				THEN to_char(date_trunc('month', m.date), 'MM/YYYY')
				ELSE to_char(make_date(m.release_year, 1, 1), 'MM/YYYY') END,
			CASE WHEN m.date IS NOT NULL
				THEN date_trunc('month', m.date)::date
				ELSE make_date(m.release_year, 1, 1) END,
			count(*)::bigint
		FROM public.musics m
		WHERE (m.date IS NOT NULL OR m.release_year IS NOT NULL)
			AND (filter_year IS NULL
				OR (m.date IS NOT NULL AND extract(year FROM m.date) = filter_year)
				OR (m.date IS NULL AND m.release_year = filter_year))
		GROUP BY 1, 2
		ORDER BY 2;
	END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_ranking_items_after_delete(
	p_ranking_id uuid,
	p_deleted_position integer
)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
	UPDATE public.user_ranking_items
	SET position = position - 1
	WHERE ranking_id = p_ranking_id AND position > p_deleted_position
$$;

CREATE OR REPLACE FUNCTION public.get_paginated_musics_by_styles(
	style_filters text[],
	search_term text DEFAULT NULL,
	year_filters integer[] DEFAULT NULL,
	is_mv boolean DEFAULT NULL,
	order_column text DEFAULT 'date',
	order_dir text DEFAULT 'desc',
	page_limit integer DEFAULT 20,
	page_offset integer DEFAULT 0
)
RETURNS TABLE(
	id uuid,
	name varchar,
	description text,
	duration integer,
	type public.music_type,
	date timestamptz,
	id_youtube_music varchar,
	thumbnails jsonb,
	verified boolean,
	created_at timestamptz,
	updated_at timestamptz,
	ismv boolean,
	release_year integer,
	total_count bigint
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
	RETURN QUERY
	WITH filtered_musics AS (
		SELECT DISTINCT m.*
		FROM public.musics m
		JOIN public.music_artists ma ON ma.music_id = m.id
		JOIN public.artists a ON a.id = ma.artist_id
		WHERE a.styles && style_filters
			AND a.verified IS TRUE
			AND (search_term IS NULL OR m.name ILIKE '%' || search_term || '%')
			AND (year_filters IS NULL OR m.release_year = ANY(year_filters))
			AND (is_mv IS NULL OR m.ismv = is_mv)
			AND m.name NOT ILIKE '%Inst.%'
			AND m.name NOT ILIKE '%Instrumental%'
			AND m.name NOT ILIKE '%Sped Up%'
			AND m.name NOT ILIKE '%(live)%'
			AND m.name NOT ILIKE '%[live]%'
			AND m.name NOT ILIKE '% - Live%'
	),
	counted AS (SELECT count(*) AS cnt FROM filtered_musics)
	SELECT fm.id, fm.name, fm.description, fm.duration, fm.type, fm.date,
		fm.id_youtube_music, fm.thumbnails, fm.verified, fm.created_at,
		fm.updated_at, fm.ismv, fm.release_year, c.cnt
	FROM filtered_musics fm
	CROSS JOIN counted c
	ORDER BY
		CASE WHEN order_column = 'date' AND order_dir = 'desc' THEN fm.date END DESC NULLS LAST,
		CASE WHEN order_column = 'date' AND order_dir = 'asc' THEN fm.date END ASC NULLS LAST,
		CASE WHEN order_column = 'name' AND order_dir = 'desc' THEN fm.name END DESC,
		CASE WHEN order_column = 'name' AND order_dir = 'asc' THEN fm.name END ASC,
		CASE WHEN order_column = 'created_at' AND order_dir = 'desc' THEN fm.created_at END DESC,
		CASE WHEN order_column = 'created_at' AND order_dir = 'asc' THEN fm.created_at END ASC
	LIMIT LEAST(GREATEST(page_limit, 0), 100)
	OFFSET GREATEST(page_offset, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_random_music_ids(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_random_music_ids_by_artist(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.search_artists_fulltext(text, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_general_stats(integer, date, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_artist_demographics() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_top_artists_by_musics(integer, date, date, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_top_artists_by_releases(integer, date, date, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_releases_temporal_stats(varchar, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_musics_temporal_stats_with_fallback(varchar, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reorder_ranking_items_after_delete(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_paginated_musics_by_styles(text[], text, integer[], boolean, text, text, integer, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_random_music_ids(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_random_music_ids_by_artist(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_artists_fulltext(text, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_general_stats(integer, date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_artist_demographics() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_top_artists_by_musics(integer, date, date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_top_artists_by_releases(integer, date, date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_releases_temporal_stats(varchar, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_musics_temporal_stats_with_fallback(varchar, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reorder_ranking_items_after_delete(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_paginated_musics_by_styles(text[], text, integer[], boolean, text, text, integer, integer) TO service_role;
