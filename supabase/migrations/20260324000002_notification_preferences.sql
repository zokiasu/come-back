CREATE TABLE public.notification_preferences (
  user_id                uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  push_enabled           boolean NOT NULL DEFAULT false,
  daily_comeback         boolean NOT NULL DEFAULT true,
  weekly_comeback        boolean NOT NULL DEFAULT true,
  followed_artist_alerts boolean NOT NULL DEFAULT true,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
