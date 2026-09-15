-- Shared with cb-artist-generator: preserve its YouTube identity indexes and RPCs.
-- Abort instead of waiting behind an ongoing import transaction.
SET LOCAL lock_timeout = '5s';

CREATE INDEX IF NOT EXISTS idx_musics_verified_date_name_id
    ON public.musics (date DESC, name ASC, id ASC)
    WHERE verified = true;

CREATE INDEX IF NOT EXISTS idx_musics_verified_mv_date_id
    ON public.musics (date DESC, id DESC)
    WHERE verified = true AND ismv = true;

ANALYZE public.musics;
ANALYZE public.music_artists;
ANALYZE public.artists;
