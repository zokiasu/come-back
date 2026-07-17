-- Replace all artist relations for a release in one database transaction.
-- Locking the release row serializes concurrent replacements for the same release.
CREATE OR REPLACE FUNCTION public.replace_release_artists(
	p_release_id uuid,
	p_artist_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
	IF p_artist_ids IS NULL OR cardinality(p_artist_ids) = 0 THEN
		RAISE EXCEPTION 'At least one artist is required'
			USING ERRCODE = 'invalid_parameter_value';
	END IF;

	PERFORM id
	FROM public.releases
	WHERE id = p_release_id
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Release does not exist'
			USING ERRCODE = 'foreign_key_violation';
	END IF;

	DELETE FROM public.artist_releases
	WHERE release_id = p_release_id;

	INSERT INTO public.artist_releases (release_id, artist_id, is_primary)
	SELECT p_release_id, artist_id, position = 1
	FROM unnest(p_artist_ids) WITH ORDINALITY AS artists(artist_id, position);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.replace_release_artists(uuid, uuid[])
	FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_release_artists(uuid, uuid[])
	TO service_role;
