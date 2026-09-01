BEGIN;

-- These extensions are not used by the application, database triggers, or
-- scheduled jobs. Keeping them enabled exposed network-capable functions from
-- the Data API schema and triggered the Supabase security advisor.
DROP EXTENSION IF EXISTS http;
DROP EXTENSION IF EXISTS pg_net;
DROP SCHEMA IF EXISTS net;

-- Foreign-key indexes used by notification fan-out and cleanup queries.
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
	ON public.push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS user_notifications_artist_id_idx
	ON public.user_notifications (artist_id);

CREATE INDEX IF NOT EXISTS user_notifications_release_id_idx
	ON public.user_notifications (release_id);

-- Evaluate auth.uid() once per statement and restrict ownership policies to
-- authenticated sessions. This removes the RLS init-plan advisor warnings.
DROP POLICY IF EXISTS "Users can manage own notification preferences"
	ON public.notification_preferences;
CREATE POLICY "Users can manage own notification preferences"
	ON public.notification_preferences
	FOR ALL
	TO authenticated
	USING ((SELECT auth.uid()) = user_id)
	WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage own push subscriptions"
	ON public.push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions"
	ON public.push_subscriptions
	FOR ALL
	TO authenticated
	USING ((SELECT auth.uid()) = user_id)
	WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage own followed artists"
	ON public.user_followed_artists;
CREATE POLICY "Users can manage own followed artists"
	ON public.user_followed_artists
	FOR ALL
	TO authenticated
	USING ((SELECT auth.uid()) = user_id)
	WITH CHECK ((SELECT auth.uid()) = user_id);

-- Both the old row and the updated row must remain owned by the caller.
DROP POLICY IF EXISTS "Users can update own rankings"
	ON public.user_rankings;
CREATE POLICY "Users can update own rankings"
	ON public.user_rankings
	FOR UPDATE
	TO authenticated
	USING ((SELECT auth.uid()) = user_id)
	WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update items in own rankings"
	ON public.user_ranking_items;
CREATE POLICY "Users can update items in own rankings"
	ON public.user_ranking_items
	FOR UPDATE
	TO authenticated
	USING (
		EXISTS (
			SELECT 1
			FROM public.user_rankings
			WHERE user_rankings.id = user_ranking_items.ranking_id
				AND user_rankings.user_id = (SELECT auth.uid())
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1
			FROM public.user_rankings
			WHERE user_rankings.id = user_ranking_items.ranking_id
				AND user_rankings.user_id = (SELECT auth.uid())
		)
	);

-- All application data mutations go through authenticated server routes using
-- the service role. Browser access is limited to the five tables subscribed to
-- by the home-page Realtime channels.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public
	FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public
	FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public
	FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON TABLE
	public.artists,
	public.musics,
	public.news,
	public.news_artists_junction,
	public.releases
	TO anon, authenticated;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- New objects must opt in to Data API exposure explicitly.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
	REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
	REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
	REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
	GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
	GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
	GRANT EXECUTE ON FUNCTIONS TO service_role;

COMMIT;
