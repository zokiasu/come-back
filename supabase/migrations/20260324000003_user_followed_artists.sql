CREATE TABLE public.user_followed_artists (
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  artist_id  uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, artist_id)
);

ALTER TABLE public.user_followed_artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own followed artists"
  ON public.user_followed_artists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX user_followed_artists_artist_id_idx
  ON public.user_followed_artists (artist_id);
