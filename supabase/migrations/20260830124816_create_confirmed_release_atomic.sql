CREATE INDEX IF NOT EXISTS idx_releases_id_youtube_music
	ON public.releases (id_youtube_music);

CREATE INDEX IF NOT EXISTS idx_musics_id_youtube_music
	ON public.musics (id_youtube_music);

CREATE OR REPLACE FUNCTION public.create_confirmed_release_atomic(
	p_artist_id uuid,
	p_release jsonb,
	p_tracks jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
	v_release_id uuid;
	v_release_youtube_id text;
	v_release_name text;
	v_release_type public.release_type;
	v_release_date timestamptz;
	v_release_date_text text;
	v_release_year integer;
	v_release_created boolean := false;
	v_existing_count integer;
	v_total_tracks integer;
	v_resolved_tracks integer;
	v_release_stream_count bigint;
	v_track jsonb;
	v_music_id uuid;
	v_music_youtube_id text;
	v_music_created_count integer := 0;
	v_music_reused_count integer := 0;
	v_relation_count integer;
	v_link_count integer;
	v_existing_release public.releases%ROWTYPE;
BEGIN
	IF jsonb_typeof(p_release) <> 'object' THEN
		RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'p_release must be a JSON object';
	END IF;

	IF jsonb_typeof(p_tracks) <> 'array' OR jsonb_array_length(p_tracks) = 0 THEN
		RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'p_tracks must be a non-empty JSON array';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM public.artists WHERE id = p_artist_id) THEN
		RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'artist does not exist';
	END IF;

	v_release_youtube_id := btrim(p_release ->> 'id_youtube_music');
	v_release_name := btrim(p_release ->> 'name');
	v_release_date_text := p_release ->> 'date';

	IF v_release_youtube_id IS NULL OR v_release_youtube_id !~ '^MPRE' THEN
		RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'a valid YouTube Music release ID is required';
	END IF;

	IF v_release_name IS NULL OR v_release_name = '' THEN
		RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'release name is required';
	END IF;

	IF nullif(p_release ->> 'type', '') IS NULL OR nullif(p_release ->> 'year', '') IS NULL THEN
		RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'release type and year are required';
	END IF;

	IF v_release_date_text IS NULL OR v_release_date_text !~ '^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$' THEN
		RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'a confirmed full release date at UTC midnight is required';
	END IF;

	BEGIN
		v_release_date := v_release_date_text::timestamptz;
		v_release_type := (p_release ->> 'type')::public.release_type;
		v_release_year := (p_release ->> 'year')::integer;
	EXCEPTION WHEN OTHERS THEN
		RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'release date, year or type is invalid';
	END;

	IF to_char(v_release_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') <> v_release_date_text
		OR extract(year FROM v_release_date AT TIME ZONE 'UTC')::integer <> v_release_year
	THEN
		RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'release date and year are inconsistent';
	END IF;

	v_total_tracks := jsonb_array_length(p_tracks);

	SELECT count(*)
	INTO v_existing_count
	FROM jsonb_array_elements(p_tracks) AS items(track)
	WHERE nullif(btrim(track ->> 'id_youtube_music'), '') IS NULL
		OR nullif(btrim(track ->> 'name'), '') IS NULL
		OR coalesce(track ->> 'track_number', '') !~ '^\d+$'
		OR (track ->> 'track_number')::integer < 1
		OR coalesce(track ->> 'stream_count', '') !~ '^\d+$';

	IF v_existing_count > 0 THEN
		RAISE EXCEPTION USING
			ERRCODE = '22023',
			MESSAGE = 'every track requires an ID, name, positive track number and confirmed stream count';
	END IF;

	SELECT
		count(DISTINCT track ->> 'id_youtube_music'),
		count(DISTINCT (track ->> 'track_number')::integer)
	INTO v_resolved_tracks, v_existing_count
	FROM jsonb_array_elements(p_tracks) AS items(track);

	IF v_resolved_tracks <> v_total_tracks OR v_existing_count <> v_total_tracks THEN
		RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'track IDs and track numbers must be unique';
	END IF;

	SELECT coalesce(sum((track ->> 'stream_count')::bigint), 0)
	INTO v_release_stream_count
	FROM jsonb_array_elements(p_tracks) AS items(track);

	v_resolved_tracks := v_total_tracks;

	PERFORM pg_catalog.pg_advisory_xact_lock(
		pg_catalog.hashtextextended('release:' || v_release_youtube_id, 0)
	);

	SELECT count(*)
	INTO v_existing_count
	FROM public.releases
	WHERE id_youtube_music = v_release_youtube_id;

	IF v_existing_count > 1 THEN
		RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ambiguous duplicate release already exists';
	ELSIF v_existing_count = 0 THEN
		INSERT INTO public.releases (
			name,
			description,
			type,
			date,
			year,
			image,
			id_youtube_music,
			verified,
			stream_count,
			resolved_tracks,
			total_tracks,
			stream_coverage,
			last_stream_sync_at,
			created_at,
			updated_at
		)
		VALUES (
			v_release_name,
			NULL,
			v_release_type,
			v_release_date,
			v_release_year,
			nullif(p_release ->> 'image', ''),
			v_release_youtube_id,
			true,
			v_release_stream_count,
			v_resolved_tracks,
			v_total_tracks,
			1,
			pg_catalog.now(),
			pg_catalog.now(),
			pg_catalog.now()
		)
		RETURNING id INTO v_release_id;

		v_release_created := true;
	ELSE
		SELECT id
		INTO STRICT v_release_id
		FROM public.releases
		WHERE id_youtube_music = v_release_youtube_id;

		SELECT *
		INTO STRICT v_existing_release
		FROM public.releases
		WHERE id = v_release_id
		FOR UPDATE;

		IF v_existing_release.name <> v_release_name
			OR v_existing_release.type IS DISTINCT FROM v_release_type
			OR (v_existing_release.date AT TIME ZONE 'UTC')::date
				<> (v_release_date AT TIME ZONE 'UTC')::date
			OR v_existing_release.year IS DISTINCT FROM v_release_year
		THEN
			RAISE EXCEPTION USING
				ERRCODE = 'P0001',
				MESSAGE = 'existing release metadata conflicts with confirmed input';
		END IF;

		UPDATE public.releases
		SET
			image = coalesce(nullif(p_release ->> 'image', ''), image),
			verified = true,
			stream_count = v_release_stream_count,
			resolved_tracks = v_resolved_tracks,
			total_tracks = v_total_tracks,
			stream_coverage = 1,
			last_stream_sync_at = pg_catalog.now(),
			updated_at = pg_catalog.now()
		WHERE id = v_release_id;
	END IF;

	INSERT INTO public.artist_releases (artist_id, release_id, is_primary)
	VALUES (p_artist_id, v_release_id, true)
	ON CONFLICT (artist_id, release_id)
	DO UPDATE SET is_primary = excluded.is_primary;

	FOR v_track IN
		SELECT track
		FROM jsonb_array_elements(p_tracks) AS items(track)
		ORDER BY track ->> 'id_youtube_music'
	LOOP
		v_music_youtube_id := btrim(v_track ->> 'id_youtube_music');

		PERFORM pg_catalog.pg_advisory_xact_lock(
			pg_catalog.hashtextextended('music:' || v_music_youtube_id, 0)
		);

		SELECT count(*)
		INTO v_existing_count
		FROM public.musics
		WHERE id_youtube_music = v_music_youtube_id;

		IF v_existing_count > 1 THEN
			RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ambiguous duplicate music already exists';
		ELSIF v_existing_count = 0 THEN
			INSERT INTO public.musics (
				name,
				description,
				duration,
				type,
				id_youtube_music,
				thumbnails,
				verified,
				ismv,
				stream_count,
				last_stream_sync_at,
				created_at,
				updated_at
			)
			VALUES (
				btrim(v_track ->> 'name'),
				NULL,
				CASE
					WHEN coalesce(v_track ->> 'duration', '') ~ '^\d+$'
						THEN (v_track ->> 'duration')::integer
					ELSE NULL
				END,
				'SONG'::public.music_type,
				v_music_youtube_id,
				coalesce(v_track -> 'thumbnails', '[]'::jsonb),
				true,
				coalesce((v_track ->> 'ismv')::boolean, false),
				(v_track ->> 'stream_count')::bigint,
				pg_catalog.now(),
				pg_catalog.now(),
				pg_catalog.now()
			)
			RETURNING id INTO v_music_id;

			v_music_created_count := v_music_created_count + 1;
		ELSE
			SELECT id
			INTO STRICT v_music_id
			FROM public.musics
			WHERE id_youtube_music = v_music_youtube_id;

			v_music_reused_count := v_music_reused_count + 1;

			UPDATE public.musics
			SET
				stream_count = (v_track ->> 'stream_count')::bigint,
				last_stream_sync_at = pg_catalog.now(),
				updated_at = pg_catalog.now()
			WHERE id = v_music_id;
		END IF;

		INSERT INTO public.music_releases (music_id, release_id, track_number)
		VALUES (v_music_id, v_release_id, (v_track ->> 'track_number')::integer)
		ON CONFLICT (release_id, music_id)
		DO UPDATE SET track_number = excluded.track_number;

		INSERT INTO public.music_artists (music_id, artist_id, is_primary)
		VALUES (v_music_id, p_artist_id, true)
		ON CONFLICT (music_id, artist_id)
		DO UPDATE SET is_primary = excluded.is_primary;
	END LOOP;

	SELECT count(*)
	INTO v_relation_count
	FROM public.music_releases
	WHERE release_id = v_release_id;

	IF v_relation_count <> v_total_tracks THEN
		RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'existing release contains a different track graph';
	END IF;

	SELECT count(*)
	INTO v_link_count
	FROM public.release_platform_links
	WHERE release_id = v_release_id
		AND lower(name) = 'youtube music';

	IF v_link_count > 1 THEN
		RAISE EXCEPTION USING
			ERRCODE = 'P0001',
			MESSAGE = 'ambiguous YouTube Music platform links already exist';
	ELSIF v_link_count = 0 THEN
		INSERT INTO public.release_platform_links (release_id, name, link)
		VALUES (
			v_release_id,
			'Youtube Music',
			'https://music.youtube.com/browse/' || v_release_youtube_id
		);
	ELSIF EXISTS (
		SELECT 1
		FROM public.release_platform_links
		WHERE release_id = v_release_id
			AND lower(name) = 'youtube music'
			AND link <> ('https://music.youtube.com/browse/' || v_release_youtube_id)
	) THEN
		RAISE EXCEPTION USING
			ERRCODE = 'P0001',
			MESSAGE = 'existing YouTube Music link conflicts with confirmed input';
	END IF;

	RETURN jsonb_build_object(
		'release_id', v_release_id,
		'release_created', v_release_created,
		'musics_created', v_music_created_count,
		'musics_reused', v_music_reused_count,
		'tracks_linked', v_total_tracks
	);
END;
$$;

REVOKE ALL ON FUNCTION public.create_confirmed_release_atomic(uuid, jsonb, jsonb)
	FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_confirmed_release_atomic(uuid, jsonb, jsonb)
	TO service_role;
