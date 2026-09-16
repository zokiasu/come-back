-- The public explorer year chips now read min/max release_year from the catalog
-- instead of assuming a fixed 2020 floor. Index the verified, non-null
-- release_year values so both top-1 scans stop at the first matching row
-- instead of sorting every verified music.
SET LOCAL lock_timeout = '5s';

CREATE INDEX IF NOT EXISTS idx_musics_verified_release_year
    ON public.musics (release_year)
    WHERE verified = true AND release_year IS NOT NULL;

ANALYZE public.musics;
