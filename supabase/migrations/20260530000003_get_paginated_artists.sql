-- Server-side artist pagination that applies ALL filters (including the
-- relation-presence ones) in SQL, so total + pagination stay consistent.
-- Previously onlyWithoutSocials/onlyWithoutPlatforms were filtered in JS AFTER
-- range(), which made `total`/`totalPages` wrong and produced short pages.
--
-- Returns the page of artist ids plus the full filtered total (window count).
-- ORDER BY uses CASE expressions (no dynamic SQL) over a fixed column allowlist;
-- a.id is the deterministic tiebreaker. Server-only (service_role).

CREATE OR REPLACE FUNCTION public.get_paginated_artists(
	p_search text DEFAULT NULL,
	p_type text DEFAULT NULL,
	p_gender text DEFAULT NULL,
	p_general_tags text[] DEFAULT NULL,
	p_nationalities text[] DEFAULT NULL,
	p_styles text[] DEFAULT NULL,
	p_active_mode text DEFAULT 'any',          -- 'any' | 'active' | 'inactive'
	p_only_without_desc boolean DEFAULT false,
	p_only_without_styles boolean DEFAULT false,
	p_only_with_styles boolean DEFAULT false,
	p_only_without_socials boolean DEFAULT false,
	p_only_without_platforms boolean DEFAULT false,
	p_verified_mode text DEFAULT 'all',        -- 'all' | 'verified' | 'unverified' | 'false_only'
	p_skip_ytm boolean DEFAULT false,
	p_order_by text DEFAULT 'name',
	p_order_dir text DEFAULT 'asc',
	p_limit int DEFAULT 20,
	p_offset int DEFAULT 0
)
RETURNS TABLE(id uuid, total_count bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
	SELECT a.id, count(*) OVER() AS total_count
	FROM public.artists a
	WHERE (p_search IS NULL OR a.name ILIKE '%' || p_search || '%' OR a.description ILIKE '%' || p_search || '%')
		AND (p_type IS NULL OR a.type = p_type::public.artist_type)
		AND (p_gender IS NULL OR a.gender = p_gender::public.gender)
		AND (p_general_tags IS NULL OR a.general_tags && p_general_tags)
		AND (p_nationalities IS NULL OR a.nationalities && p_nationalities)
		AND (p_styles IS NULL OR a.styles && p_styles)
		AND (
			p_active_mode = 'any'
			OR (p_active_mode = 'active' AND a.active_career IS TRUE)
			OR (p_active_mode = 'inactive' AND (a.active_career IS FALSE OR a.active_career IS NULL))
		)
		AND (NOT p_only_without_desc OR a.description IS NULL OR a.description = '')
		AND (NOT p_only_without_styles OR a.styles IS NULL OR a.styles = '{}')
		AND (NOT p_only_with_styles OR (a.styles IS NOT NULL AND a.styles <> '{}'))
		AND (
			p_verified_mode = 'all'
			OR (p_verified_mode = 'verified' AND a.verified IS TRUE)
			OR (p_verified_mode = 'unverified' AND (a.verified IS NULL OR a.verified IS FALSE))
			OR (p_verified_mode = 'false_only' AND a.verified IS FALSE)
		)
		AND (p_skip_ytm OR a.id_youtube_music IS NOT NULL)
		AND (NOT p_only_without_socials
			OR NOT EXISTS (SELECT 1 FROM public.artist_social_links sl WHERE sl.artist_id = a.id))
		AND (NOT p_only_without_platforms
			OR NOT EXISTS (SELECT 1 FROM public.artist_platform_links pl WHERE pl.artist_id = a.id))
	ORDER BY
		(CASE WHEN p_order_by = 'name' AND p_order_dir = 'asc' THEN a.name END) ASC NULLS LAST,
		(CASE WHEN p_order_by = 'name' AND p_order_dir = 'desc' THEN a.name END) DESC NULLS LAST,
		(CASE WHEN p_order_by = 'type' AND p_order_dir = 'asc' THEN a.type END) ASC NULLS LAST,
		(CASE WHEN p_order_by = 'type' AND p_order_dir = 'desc' THEN a.type END) DESC NULLS LAST,
		(CASE WHEN p_order_by = 'created_at' AND p_order_dir = 'asc' THEN a.created_at END) ASC NULLS LAST,
		(CASE WHEN p_order_by = 'created_at' AND p_order_dir = 'desc' THEN a.created_at END) DESC NULLS LAST,
		(CASE WHEN p_order_by = 'updated_at' AND p_order_dir = 'asc' THEN a.updated_at END) ASC NULLS LAST,
		(CASE WHEN p_order_by = 'updated_at' AND p_order_dir = 'desc' THEN a.updated_at END) DESC NULLS LAST,
		(CASE WHEN p_order_by = 'verified' AND p_order_dir = 'asc' THEN a.verified END) ASC NULLS LAST,
		(CASE WHEN p_order_by = 'verified' AND p_order_dir = 'desc' THEN a.verified END) DESC NULLS LAST,
		(CASE WHEN p_order_by = 'debut_date' AND p_order_dir = 'asc' THEN a.debut_date END) ASC NULLS LAST,
		(CASE WHEN p_order_by = 'debut_date' AND p_order_dir = 'desc' THEN a.debut_date END) DESC NULLS LAST,
		a.id ASC
	LIMIT GREATEST(p_limit, 0) OFFSET GREATEST(p_offset, 0)
$$;

REVOKE EXECUTE ON FUNCTION public.get_paginated_artists(
	text, text, text, text[], text[], text[], text, boolean, boolean, boolean,
	boolean, boolean, text, boolean, text, text, int, int
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_paginated_artists(
	text, text, text, text[], text[], text[], text, boolean, boolean, boolean,
	boolean, boolean, text, boolean, text, text, int, int
) TO service_role;
