-- Fix: update_artist_with_relations deleted BOTH relation sides when only one
-- was provided. Updating only p_group_ids wiped the artist's members (and vice
-- versa), contradicting the "NULL = leave this set untouched" contract.
--
-- Now each side is independent and scoped by relation_type:
--   * p_group_ids  -> rows where the artist is the MEMBER (groups it belongs to)
--   * p_member_ids -> rows where the artist is the GROUP  (its members)
-- PRODUCER/COMPOSER relations are no longer collaterally deleted.
-- Everything else (artist row merge, social/platform/company sets) is unchanged.

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

	IF p_social_links IS NOT NULL THEN
		DELETE FROM public.artist_social_links WHERE artist_id = p_artist_id;
		IF jsonb_array_length(p_social_links) > 0 THEN
			INSERT INTO public.artist_social_links (artist_id, name, link)
			SELECT p_artist_id, s->>'name', s->>'link'
			FROM jsonb_array_elements(p_social_links) AS s;
		END IF;
	END IF;

	IF p_platform_links IS NOT NULL THEN
		DELETE FROM public.artist_platform_links WHERE artist_id = p_artist_id;
		IF jsonb_array_length(p_platform_links) > 0 THEN
			INSERT INTO public.artist_platform_links (artist_id, name, link)
			SELECT p_artist_id, p->>'name', p->>'link'
			FROM jsonb_array_elements(p_platform_links) AS p;
		END IF;
	END IF;

	-- Groups the artist belongs to (artist is the member). Only touched when
	-- p_group_ids is provided; the members side stays intact.
	IF p_group_ids IS NOT NULL THEN
		DELETE FROM public.artist_relations
		WHERE member_id = p_artist_id AND relation_type = 'MEMBER';
		IF jsonb_array_length(p_group_ids) > 0 THEN
			INSERT INTO public.artist_relations (group_id, member_id, relation_type)
			SELECT g::uuid, p_artist_id, 'MEMBER'::public.relation_type
			FROM jsonb_array_elements_text(p_group_ids) AS g;
		END IF;
	END IF;

	-- Members of the artist (artist is the group). Only touched when
	-- p_member_ids is provided.
	IF p_member_ids IS NOT NULL THEN
		DELETE FROM public.artist_relations
		WHERE group_id = p_artist_id AND relation_type = 'GROUP';
		IF jsonb_array_length(p_member_ids) > 0 THEN
			INSERT INTO public.artist_relations (group_id, member_id, relation_type)
			SELECT p_artist_id, m::uuid, 'GROUP'::public.relation_type
			FROM jsonb_array_elements_text(p_member_ids) AS m;
		END IF;
	END IF;

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
