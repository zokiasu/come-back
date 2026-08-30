BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(23);

SELECT has_index(
	'public',
	'push_subscriptions',
	'push_subscriptions_user_id_idx',
	'push subscriptions are indexed by user'
);
SELECT has_index(
	'public',
	'user_notifications',
	'user_notifications_artist_id_idx',
	'notifications are indexed by artist'
);
SELECT has_index(
	'public',
	'user_notifications',
	'user_notifications_release_id_idx',
	'notifications are indexed by release'
);

SELECT is(
	(SELECT count(*) FROM pg_extension WHERE extname = 'http'),
	0::bigint,
	'unused synchronous HTTP extension is disabled'
);
SELECT is(
	(SELECT count(*) FROM pg_extension WHERE extname = 'pg_net'),
	0::bigint,
	'unused asynchronous HTTP extension is disabled'
);

SELECT ok(
	(
		SELECT bool_and(has_table_privilege('anon', table_name, 'SELECT'))
		FROM unnest(ARRAY[
			'public.artists',
			'public.musics',
			'public.news',
			'public.news_artists_junction',
			'public.releases'
		]) AS realtime_tables(table_name)
	),
	'anon can read every Realtime source table'
);
SELECT ok(
	(
		SELECT bool_and(has_table_privilege('authenticated', table_name, 'SELECT'))
		FROM unnest(ARRAY[
			'public.artists',
			'public.musics',
			'public.news',
			'public.news_artists_junction',
			'public.releases'
		]) AS realtime_tables(table_name)
	),
	'authenticated can read every Realtime source table'
);
SELECT ok(
	NOT has_table_privilege('anon', 'public.notification_preferences', 'SELECT'),
	'anon cannot read notification preferences'
);
SELECT ok(
	NOT has_table_privilege('authenticated', 'public.notification_preferences', 'SELECT'),
	'authenticated clients cannot bypass the notification API'
);
SELECT ok(
	NOT has_table_privilege('authenticated', 'public.artists', 'INSERT'),
	'authenticated clients cannot mutate content tables directly'
);
SELECT ok(
	NOT has_function_privilege('anon', 'public.get_general_stats()', 'EXECUTE'),
	'anon cannot invoke server RPCs'
);
SELECT ok(
	NOT has_function_privilege('authenticated', 'public.get_general_stats()', 'EXECUTE'),
	'authenticated clients cannot invoke server RPCs'
);
SELECT ok(
	has_function_privilege('service_role', 'public.get_general_stats()', 'EXECUTE'),
	'service role can invoke server RPCs'
);
SELECT has_function(
	'public',
	'replace_release_artists',
	ARRAY['uuid', 'uuid[]'],
	'release artist replacement RPC exists'
);
SELECT ok(
	has_table_privilege('service_role', 'public.notification_preferences', 'SELECT,INSERT,UPDATE,DELETE'),
	'service role retains notification access'
);

SELECT is(
	(SELECT roles FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_preferences' AND policyname = 'Users can manage own notification preferences'),
	ARRAY['authenticated']::name[],
	'notification preferences policy targets authenticated users'
);
SELECT ok(
	(SELECT qual LIKE '%SELECT auth.uid()%' FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_preferences' AND policyname = 'Users can manage own notification preferences'),
	'notification preferences caches auth.uid per statement'
);
SELECT is(
	(SELECT roles FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'Users can manage own push subscriptions'),
	ARRAY['authenticated']::name[],
	'push subscriptions policy targets authenticated users'
);
SELECT ok(
	(SELECT qual LIKE '%SELECT auth.uid()%' FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'Users can manage own push subscriptions'),
	'push subscriptions caches auth.uid per statement'
);
SELECT is(
	(SELECT roles FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_followed_artists' AND policyname = 'Users can manage own followed artists'),
	ARRAY['authenticated']::name[],
	'followed artists policy targets authenticated users'
);
SELECT ok(
	(SELECT qual LIKE '%SELECT auth.uid()%' FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_followed_artists' AND policyname = 'Users can manage own followed artists'),
	'followed artists caches auth.uid per statement'
);
SELECT isnt(
	(SELECT with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_rankings' AND policyname = 'Users can update own rankings'),
	NULL,
	'ranking updates validate the resulting owner'
);
SELECT isnt(
	(SELECT with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_ranking_items' AND policyname = 'Users can update items in own rankings'),
	NULL,
	'ranking item updates validate the resulting ranking owner'
);

SELECT * FROM finish();
ROLLBACK;
