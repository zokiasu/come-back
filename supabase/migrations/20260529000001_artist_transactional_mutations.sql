-- Transactional artist mutations
--
-- Replaces the application-side "insert artist, then best-effort insert
-- relations with swallowed errors" flow (which could leave an artist persisted
-- without its relations and still return 200) with two atomic RPCs. A PL/pgSQL
-- function runs in a single transaction: if any statement raises, every change
-- is rolled back and the error propagates to the caller.
--
-- Relation params use JSONB:
--   * create: an empty array means "no relations".
--   * update: SQL NULL means "leave this relation set untouched"; a (possibly
--     empty) array means "replace the whole set with exactly these rows".
--
-- EXECUTE is restricted to service_role so a logged-in user cannot call these
-- through PostgREST and bypass the requireContributor guard in the API layer.

-- ---------------------------------------------------------------------------
-- CREATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_artist_with_relations(
	p_artist jsonb,
	p_social_links jsonb DEFAULT '[]'::jsonb,
	p_platform_links jsonb DEFAULT '[]'::jsonb,
	p_group_ids jsonb DEFAULT '[]'::jsonb,
	p_member_ids jsonb DEFAULT '[]'::jsonb,
	p_companies jsonb DEFAULT '[]'::jsonb
)
RETURNS public.artists
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
	v_artist public.artists;
BEGIN
	IF COALESCE(p_artist->>'name', '') = '' THEN
		RAISE EXCEPTION 'Artist name is required' USING ERRCODE = 'check_violation';
	END IF;

	INSERT INTO public.artists (
		name, description, type, gender, id_youtube_music, image,
		active_career, verified, general_tags, styles, nationalities,
		birth_date, debut_date
	)
	VALUES (
		p_artist->>'name',
		p_artist->>'description',
		NULLIF(p_artist->>'type', '')::public.artist_type,
		NULLIF(p_artist->>'gender', '')::public.gender,
		NULLIF(p_artist->>'id_youtube_music', ''),
		COALESCE(NULLIF(p_artist->>'image', ''), 'https://i.ibb.co/wLhbFZx/Frame-255.png'),
		COALESCE((p_artist->>'active_career')::boolean, true),
		COALESCE((p_artist->>'verified')::boolean, false),
		CASE WHEN jsonb_typeof(p_artist->'general_tags') = 'array'
			THEN ARRAY(SELECT jsonb_array_elements_text(p_artist->'general_tags')) ELSE '{}'::text[] END,
		CASE WHEN jsonb_typeof(p_artist->'styles') = 'array'
			THEN ARRAY(SELECT jsonb_array_elements_text(p_artist->'styles')) ELSE '{}'::text[] END,
		CASE WHEN jsonb_typeof(p_artist->'nationalities') = 'array'
			THEN ARRAY(SELECT jsonb_array_elements_text(p_artist->'nationalities')) ELSE '{}'::text[] END,
		NULLIF(p_artist->>'birth_date', '')::timestamptz,
		NULLIF(p_artist->>'debut_date', '')::timestamptz
	)
	RETURNING * INTO v_artist;

	-- Social links
	IF jsonb_array_length(COALESCE(p_social_links, '[]'::jsonb)) > 0 THEN
		INSERT INTO public.artist_social_links (artist_id, name, link)
		SELECT v_artist.id, s->>'name', s->>'link'
		FROM jsonb_array_elements(p_social_links) AS s;
	END IF;

	-- Platform links
	IF jsonb_array_length(COALESCE(p_platform_links, '[]'::jsonb)) > 0 THEN
		INSERT INTO public.artist_platform_links (artist_id, name, link)
		SELECT v_artist.id, p->>'name', p->>'link'
		FROM jsonb_array_elements(p_platform_links) AS p;
	END IF;

	-- Groups the artist is a member of
	IF jsonb_array_length(COALESCE(p_group_ids, '[]'::jsonb)) > 0 THEN
		INSERT INTO public.artist_relations (group_id, member_id, relation_type)
		SELECT g::uuid, v_artist.id, 'MEMBER'::public.relation_type
		FROM jsonb_array_elements_text(p_group_ids) AS g;
	END IF;

	-- Members of the artist (when the artist is a group)
	IF jsonb_array_length(COALESCE(p_member_ids, '[]'::jsonb)) > 0 THEN
		INSERT INTO public.artist_relations (group_id, member_id, relation_type)
		SELECT v_artist.id, m::uuid, 'GROUP'::public.relation_type
		FROM jsonb_array_elements_text(p_member_ids) AS m;
	END IF;

	-- Companies
	IF jsonb_array_length(COALESCE(p_companies, '[]'::jsonb)) > 0 THEN
		INSERT INTO public.artist_companies (
			artist_id, company_id, start_date, end_date, is_current, relationship_type
		)
		SELECT
			v_artist.id,
			(c->>'company_id')::uuid,
			NULLIF(c->>'start_date', '')::date,
			NULLIF(c->>'end_date', '')::date,
			COALESCE((c->>'is_current')::boolean, true),
			NULLIF(c->>'relationship_type', '')
		FROM jsonb_array_elements(p_companies) AS c;
	END IF;

	RETURN v_artist;
END;
$$;

-- ---------------------------------------------------------------------------
-- UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_artist_with_relations(
	p_artist_id uuid,
	p_updates jsonb DEFAULT NULL,
	p_social_links jsonb DEFAULT NULL,
	p_platform_links jsonb DEFAULT NULL,
	p_group_ids jsonb DEFAULT NULL,
	p_member_ids jsonb DEFAULT NULL,
	p_companies jsonb DEFAULT NULL
)
RETURNS public.artists
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
	v_artist public.artists;
BEGIN
	IF NOT EXISTS (SELECT 1 FROM public.artists WHERE id = p_artist_id) THEN
		RETURN NULL;
	END IF;

	-- Partial update of the artist row: overlay the provided keys onto the
	-- existing row via jsonb_populate_record (missing keys keep their value).
	IF p_updates IS NOT NULL AND p_updates <> '{}'::jsonb THEN
		WITH merged AS (
			SELECT (jsonb_populate_record(a, p_updates)).*
			FROM public.artists a
			WHERE a.id = p_artist_id
		)
		UPDATE public.artists t
		SET
			name = merged.name,
			description = merged.description,
			type = merged.type,
			gender = merged.gender,
			id_youtube_music = merged.id_youtube_music,
			image = merged.image,
			active_career = merged.active_career,
			verified = merged.verified,
			general_tags = merged.general_tags,
			styles = merged.styles,
			nationalities = merged.nationalities,
			birth_date = merged.birth_date,
			debut_date = merged.debut_date,
			check_tier = merged.check_tier,
			last_checked_at = merged.last_checked_at,
			updated_at = now()
		FROM merged
		WHERE t.id = p_artist_id;
	END IF;

	-- Social links: replace the whole set when provided.
	IF p_social_links IS NOT NULL THEN
		DELETE FROM public.artist_social_links WHERE artist_id = p_artist_id;
		IF jsonb_array_length(p_social_links) > 0 THEN
			INSERT INTO public.artist_social_links (artist_id, name, link)
			SELECT p_artist_id, s->>'name', s->>'link'
			FROM jsonb_array_elements(p_social_links) AS s;
		END IF;
	END IF;

	-- Platform links: replace the whole set when provided.
	IF p_platform_links IS NOT NULL THEN
		DELETE FROM public.artist_platform_links WHERE artist_id = p_artist_id;
		IF jsonb_array_length(p_platform_links) > 0 THEN
			INSERT INTO public.artist_platform_links (artist_id, name, link)
			SELECT p_artist_id, p->>'name', p->>'link'
			FROM jsonb_array_elements(p_platform_links) AS p;
		END IF;
	END IF;

	-- Relations: rebuild every relation involving this artist when either side
	-- is provided (mirrors the previous endpoint behaviour).
	IF p_group_ids IS NOT NULL OR p_member_ids IS NOT NULL THEN
		DELETE FROM public.artist_relations
		WHERE group_id = p_artist_id OR member_id = p_artist_id;

		IF p_group_ids IS NOT NULL AND jsonb_array_length(p_group_ids) > 0 THEN
			INSERT INTO public.artist_relations (group_id, member_id, relation_type)
			SELECT g::uuid, p_artist_id, 'MEMBER'::public.relation_type
			FROM jsonb_array_elements_text(p_group_ids) AS g;
		END IF;

		IF p_member_ids IS NOT NULL AND jsonb_array_length(p_member_ids) > 0 THEN
			INSERT INTO public.artist_relations (group_id, member_id, relation_type)
			SELECT p_artist_id, m::uuid, 'GROUP'::public.relation_type
			FROM jsonb_array_elements_text(p_member_ids) AS m;
		END IF;
	END IF;

	-- Companies: replace the whole set when provided.
	IF p_companies IS NOT NULL THEN
		DELETE FROM public.artist_companies WHERE artist_id = p_artist_id;
		IF jsonb_array_length(p_companies) > 0 THEN
			INSERT INTO public.artist_companies (
				artist_id, company_id, start_date, end_date, is_current, relationship_type
			)
			SELECT
				p_artist_id,
				(c->>'company_id')::uuid,
				NULLIF(c->>'start_date', '')::date,
				NULLIF(c->>'end_date', '')::date,
				COALESCE((c->>'is_current')::boolean, true),
				NULLIF(c->>'relationship_type', '')
			FROM jsonb_array_elements(p_companies) AS c;
		END IF;
	END IF;

	SELECT * INTO v_artist FROM public.artists WHERE id = p_artist_id;
	RETURN v_artist;
END;
$$;

-- ---------------------------------------------------------------------------
-- Permissions: server-only (service role). Block anon/authenticated so the
-- functions cannot be invoked directly via PostgREST, bypassing API auth.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.create_artist_with_relations(jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_artist_with_relations(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_artist_with_relations(jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_artist_with_relations(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) TO service_role;
