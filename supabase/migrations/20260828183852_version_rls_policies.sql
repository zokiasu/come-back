-- Declarative baseline generated from the linked production project's pg_policies.
-- It versions every public-schema RLS policy without changing its behavior.
-- Keep this migration after private_rls_helpers so policy expressions can reference
-- private.is_admin() and private.is_contributor_or_admin().

ALTER TABLE public."artist_companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."artist_platform_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."artist_relations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."artist_releases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."artist_social_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."artists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."firebase_user_mapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."general_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ignored_artists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."music_artists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."music_releases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."music_styles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."musics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."nationalities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."news" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."news_artists_junction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."release_platform_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."releases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_artist_contributions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_followed_artists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_news_contributions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_ranking_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_rankings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete artist companies" ON public."artist_companies";
CREATE POLICY "Admins can delete artist companies" ON public."artist_companies" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_admin());

DROP POLICY IF EXISTS "Artist companies are viewable by everyone" ON public."artist_companies";
CREATE POLICY "Artist companies are viewable by everyone" ON public."artist_companies" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Contributors can insert artist companies" ON public."artist_companies";
CREATE POLICY "Contributors can insert artist companies" ON public."artist_companies" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can update artist companies" ON public."artist_companies";
CREATE POLICY "Contributors can update artist companies" ON public."artist_companies" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_contributor_or_admin()) WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Artist platform links are viewable by everyone" ON public."artist_platform_links";
CREATE POLICY "Artist platform links are viewable by everyone" ON public."artist_platform_links" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Contributors can delete artist platform links" ON public."artist_platform_links";
CREATE POLICY "Contributors can delete artist platform links" ON public."artist_platform_links" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can insert artist platform links" ON public."artist_platform_links";
CREATE POLICY "Contributors can insert artist platform links" ON public."artist_platform_links" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can update artist platform links" ON public."artist_platform_links";
CREATE POLICY "Contributors can update artist platform links" ON public."artist_platform_links" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_contributor_or_admin()) WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Artist relations are viewable by everyone" ON public."artist_relations";
CREATE POLICY "Artist relations are viewable by everyone" ON public."artist_relations" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Contributors can delete artist relations" ON public."artist_relations";
CREATE POLICY "Contributors can delete artist relations" ON public."artist_relations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can insert artist relations" ON public."artist_relations";
CREATE POLICY "Contributors can insert artist relations" ON public."artist_relations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can update artist relations" ON public."artist_relations";
CREATE POLICY "Contributors can update artist relations" ON public."artist_relations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_contributor_or_admin()) WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Artist releases are viewable by everyone" ON public."artist_releases";
CREATE POLICY "Artist releases are viewable by everyone" ON public."artist_releases" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Contributors can delete artist releases" ON public."artist_releases";
CREATE POLICY "Contributors can delete artist releases" ON public."artist_releases" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can insert artist releases" ON public."artist_releases";
CREATE POLICY "Contributors can insert artist releases" ON public."artist_releases" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can update artist releases" ON public."artist_releases";
CREATE POLICY "Contributors can update artist releases" ON public."artist_releases" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_contributor_or_admin()) WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Artist social links are viewable by everyone" ON public."artist_social_links";
CREATE POLICY "Artist social links are viewable by everyone" ON public."artist_social_links" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Contributors can delete artist social links" ON public."artist_social_links";
CREATE POLICY "Contributors can delete artist social links" ON public."artist_social_links" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can insert artist social links" ON public."artist_social_links";
CREATE POLICY "Contributors can insert artist social links" ON public."artist_social_links" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can update artist social links" ON public."artist_social_links";
CREATE POLICY "Contributors can update artist social links" ON public."artist_social_links" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_contributor_or_admin()) WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Admins can delete artists" ON public."artists";
CREATE POLICY "Admins can delete artists" ON public."artists" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_admin());

DROP POLICY IF EXISTS "Artists are viewable by everyone" ON public."artists";
CREATE POLICY "Artists are viewable by everyone" ON public."artists" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Contributors can insert artists" ON public."artists";
CREATE POLICY "Contributors can insert artists" ON public."artists" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can update artists" ON public."artists";
CREATE POLICY "Contributors can update artists" ON public."artists" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_contributor_or_admin()) WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Admins can delete companies" ON public."companies";
CREATE POLICY "Admins can delete companies" ON public."companies" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_admin());

DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public."companies";
CREATE POLICY "Companies are viewable by everyone" ON public."companies" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Contributors can insert companies" ON public."companies";
CREATE POLICY "Contributors can insert companies" ON public."companies" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can update companies" ON public."companies";
CREATE POLICY "Contributors can update companies" ON public."companies" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_contributor_or_admin()) WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Firebase mapping is viewable by own user" ON public."firebase_user_mapping";
CREATE POLICY "Firebase mapping is viewable by own user" ON public."firebase_user_mapping" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((supabase_id = ( SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS "Admins can delete general tags" ON public."general_tags";
CREATE POLICY "Admins can delete general tags" ON public."general_tags" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_admin());

DROP POLICY IF EXISTS "Admins can insert general tags" ON public."general_tags";
CREATE POLICY "Admins can insert general tags" ON public."general_tags" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins can update general tags" ON public."general_tags";
CREATE POLICY "Admins can update general tags" ON public."general_tags" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "General tags are viewable by everyone" ON public."general_tags";
CREATE POLICY "General tags are viewable by everyone" ON public."general_tags" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Allow read access to ignored_artists" ON public."ignored_artists";
CREATE POLICY "Allow read access to ignored_artists" ON public."ignored_artists" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Contributors can delete music artists" ON public."music_artists";
CREATE POLICY "Contributors can delete music artists" ON public."music_artists" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can insert music artists" ON public."music_artists";
CREATE POLICY "Contributors can insert music artists" ON public."music_artists" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can update music artists" ON public."music_artists";
CREATE POLICY "Contributors can update music artists" ON public."music_artists" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_contributor_or_admin()) WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Music artists are viewable by everyone" ON public."music_artists";
CREATE POLICY "Music artists are viewable by everyone" ON public."music_artists" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Contributors can delete music releases" ON public."music_releases";
CREATE POLICY "Contributors can delete music releases" ON public."music_releases" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can insert music releases" ON public."music_releases";
CREATE POLICY "Contributors can insert music releases" ON public."music_releases" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can update music releases" ON public."music_releases";
CREATE POLICY "Contributors can update music releases" ON public."music_releases" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_contributor_or_admin()) WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Music releases are viewable by everyone" ON public."music_releases";
CREATE POLICY "Music releases are viewable by everyone" ON public."music_releases" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Admins can delete music styles" ON public."music_styles";
CREATE POLICY "Admins can delete music styles" ON public."music_styles" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_admin());

DROP POLICY IF EXISTS "Admins can insert music styles" ON public."music_styles";
CREATE POLICY "Admins can insert music styles" ON public."music_styles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins can update music styles" ON public."music_styles";
CREATE POLICY "Admins can update music styles" ON public."music_styles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Music styles are viewable by everyone" ON public."music_styles";
CREATE POLICY "Music styles are viewable by everyone" ON public."music_styles" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Admins can delete musics" ON public."musics";
CREATE POLICY "Admins can delete musics" ON public."musics" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_admin());

DROP POLICY IF EXISTS "Contributors can insert musics" ON public."musics";
CREATE POLICY "Contributors can insert musics" ON public."musics" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can update musics" ON public."musics";
CREATE POLICY "Contributors can update musics" ON public."musics" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_contributor_or_admin()) WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Musics are viewable by everyone" ON public."musics";
CREATE POLICY "Musics are viewable by everyone" ON public."musics" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Admins can delete nationalities" ON public."nationalities";
CREATE POLICY "Admins can delete nationalities" ON public."nationalities" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_admin());

DROP POLICY IF EXISTS "Admins can insert nationalities" ON public."nationalities";
CREATE POLICY "Admins can insert nationalities" ON public."nationalities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins can update nationalities" ON public."nationalities";
CREATE POLICY "Admins can update nationalities" ON public."nationalities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Nationalities are viewable by everyone" ON public."nationalities";
CREATE POLICY "Nationalities are viewable by everyone" ON public."nationalities" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Admins can delete news" ON public."news";
CREATE POLICY "Admins can delete news" ON public."news" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_admin());

DROP POLICY IF EXISTS "Contributors can insert news" ON public."news";
CREATE POLICY "Contributors can insert news" ON public."news" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can update news" ON public."news";
CREATE POLICY "Contributors can update news" ON public."news" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_contributor_or_admin()) WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "News are viewable by everyone" ON public."news";
CREATE POLICY "News are viewable by everyone" ON public."news" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Contributors can delete news artists" ON public."news_artists_junction";
CREATE POLICY "Contributors can delete news artists" ON public."news_artists_junction" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can insert news artists" ON public."news_artists_junction";
CREATE POLICY "Contributors can insert news artists" ON public."news_artists_junction" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can update news artists" ON public."news_artists_junction";
CREATE POLICY "Contributors can update news artists" ON public."news_artists_junction" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_contributor_or_admin()) WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "News artists junction are viewable by everyone" ON public."news_artists_junction";
CREATE POLICY "News artists junction are viewable by everyone" ON public."news_artists_junction" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Users can manage own notification preferences" ON public."notification_preferences";
CREATE POLICY "Users can manage own notification preferences" ON public."notification_preferences" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public."push_subscriptions";
CREATE POLICY "Users can manage own push subscriptions" ON public."push_subscriptions" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Contributors can delete release platform links" ON public."release_platform_links";
CREATE POLICY "Contributors can delete release platform links" ON public."release_platform_links" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can insert release platform links" ON public."release_platform_links";
CREATE POLICY "Contributors can insert release platform links" ON public."release_platform_links" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can update release platform links" ON public."release_platform_links";
CREATE POLICY "Contributors can update release platform links" ON public."release_platform_links" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_contributor_or_admin()) WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Release platform links are viewable by everyone" ON public."release_platform_links";
CREATE POLICY "Release platform links are viewable by everyone" ON public."release_platform_links" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Admins can delete releases" ON public."releases";
CREATE POLICY "Admins can delete releases" ON public."releases" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_admin());

DROP POLICY IF EXISTS "Contributors can insert releases" ON public."releases";
CREATE POLICY "Contributors can insert releases" ON public."releases" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Contributors can update releases" ON public."releases";
CREATE POLICY "Contributors can update releases" ON public."releases" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_contributor_or_admin()) WITH CHECK (private.is_contributor_or_admin());

DROP POLICY IF EXISTS "Releases are viewable by everyone" ON public."releases";
CREATE POLICY "Releases are viewable by everyone" ON public."releases" AS PERMISSIVE FOR SELECT TO "public" USING (true);

DROP POLICY IF EXISTS "Contributions are viewable by admins" ON public."user_artist_contributions";
CREATE POLICY "Contributions are viewable by admins" ON public."user_artist_contributions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.is_admin() OR (user_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can insert own contributions" ON public."user_artist_contributions";
CREATE POLICY "Users can insert own contributions" ON public."user_artist_contributions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS "Users can manage own followed artists" ON public."user_followed_artists";
CREATE POLICY "Users can manage own followed artists" ON public."user_followed_artists" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "News contributions are viewable by admins" ON public."user_news_contributions";
CREATE POLICY "News contributions are viewable by admins" ON public."user_news_contributions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.is_admin() OR (user_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "Users can insert own news contributions" ON public."user_news_contributions";
CREATE POLICY "Users can insert own news contributions" ON public."user_news_contributions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS "Users can read own notifications" ON public."user_notifications";
CREATE POLICY "Users can read own notifications" ON public."user_notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id));

DROP POLICY IF EXISTS "Users can update own notifications" ON public."user_notifications";
CREATE POLICY "Users can update own notifications" ON public."user_notifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

DROP POLICY IF EXISTS "Users can add items to own rankings" ON public."user_ranking_items";
CREATE POLICY "Users can add items to own rankings" ON public."user_ranking_items" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((EXISTS ( SELECT 1
   FROM user_rankings
  WHERE ((user_rankings.id = user_ranking_items.ranking_id) AND (user_rankings.user_id = ( SELECT auth.uid() AS uid))))));

DROP POLICY IF EXISTS "Users can delete items from own rankings" ON public."user_ranking_items";
CREATE POLICY "Users can delete items from own rankings" ON public."user_ranking_items" AS PERMISSIVE FOR DELETE TO "public" USING ((EXISTS ( SELECT 1
   FROM user_rankings
  WHERE ((user_rankings.id = user_ranking_items.ranking_id) AND (user_rankings.user_id = ( SELECT auth.uid() AS uid))))));

DROP POLICY IF EXISTS "Users can update items in own rankings" ON public."user_ranking_items";
CREATE POLICY "Users can update items in own rankings" ON public."user_ranking_items" AS PERMISSIVE FOR UPDATE TO "public" USING ((EXISTS ( SELECT 1
   FROM user_rankings
  WHERE ((user_rankings.id = user_ranking_items.ranking_id) AND (user_rankings.user_id = ( SELECT auth.uid() AS uid))))));

DROP POLICY IF EXISTS "Users can view ranking items" ON public."user_ranking_items";
CREATE POLICY "Users can view ranking items" ON public."user_ranking_items" AS PERMISSIVE FOR SELECT TO "public" USING ((EXISTS ( SELECT 1
   FROM user_rankings
  WHERE ((user_rankings.id = user_ranking_items.ranking_id) AND ((user_rankings.user_id = ( SELECT auth.uid() AS uid)) OR (user_rankings.is_public = true))))));

DROP POLICY IF EXISTS "Users can create own rankings" ON public."user_rankings";
CREATE POLICY "Users can create own rankings" ON public."user_rankings" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

DROP POLICY IF EXISTS "Users can delete own rankings" ON public."user_rankings";
CREATE POLICY "Users can delete own rankings" ON public."user_rankings" AS PERMISSIVE FOR DELETE TO "public" USING ((( SELECT auth.uid() AS uid) = user_id));

DROP POLICY IF EXISTS "Users can update own rankings" ON public."user_rankings";
CREATE POLICY "Users can update own rankings" ON public."user_rankings" AS PERMISSIVE FOR UPDATE TO "public" USING ((( SELECT auth.uid() AS uid) = user_id));

DROP POLICY IF EXISTS "Users can view own rankings" ON public."user_rankings";
CREATE POLICY "Users can view own rankings" ON public."user_rankings" AS PERMISSIVE FOR SELECT TO "public" USING (((( SELECT auth.uid() AS uid) = user_id) OR (is_public = true)));

DROP POLICY IF EXISTS "Users can insert own profile" ON public."users";
CREATE POLICY "Users can insert own profile" ON public."users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT auth.uid() AS uid) = id) AND (role = 'USER'::user_role)));

DROP POLICY IF EXISTS "Users can read own profile" ON public."users";
CREATE POLICY "Users can read own profile" ON public."users" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = id));

DROP POLICY IF EXISTS "Users can update own profile" ON public."users";
CREATE POLICY "Users can update own profile" ON public."users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT auth.uid() AS uid) = id)) WITH CHECK ((( SELECT auth.uid() AS uid) = id));
