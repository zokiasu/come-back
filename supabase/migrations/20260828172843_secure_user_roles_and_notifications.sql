-- Version aligned with the migration recorded by the linked Supabase project.
BEGIN;

-- The Data API roles previously had every table privilege on users. RLS limited
-- the affected row, but it did not prevent a user from changing their own role.
-- Keep the permissions required by the currently deployed profile flow while a
-- trigger enforces the privilege boundary independently from client payloads.
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER
	ON TABLE public.users
	FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can read own profile"
	ON public.users
	FOR SELECT
	TO authenticated
	USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
	ON public.users
	FOR INSERT
	TO authenticated
	WITH CHECK (
		(SELECT auth.uid()) = id
		AND role = 'USER'::public.user_role
	);

CREATE POLICY "Users can update own profile"
	ON public.users
	FOR UPDATE
	TO authenticated
	USING ((SELECT auth.uid()) = id)
	WITH CHECK ((SELECT auth.uid()) = id);

CREATE OR REPLACE FUNCTION public.prevent_user_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
	IF current_user IN ('anon', 'authenticated')
		AND NEW.role IS DISTINCT FROM OLD.role THEN
		RAISE EXCEPTION 'The user role cannot be changed through the public profile API'
			USING ERRCODE = 'insufficient_privilege';
	END IF;

	RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.prevent_user_privilege_escalation()
	FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_user_privilege_escalation ON public.users;
CREATE TRIGGER prevent_user_privilege_escalation
	BEFORE UPDATE OF role ON public.users
	FOR EACH ROW
	EXECUTE FUNCTION public.prevent_user_privilege_escalation();

-- Trigger functions do not need to be callable as public RPC endpoints.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
	FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_artist_creation_contribution()
	FROM PUBLIC, anon, authenticated;

-- Notifications are read and mutated exclusively through authenticated server
-- endpoints using the service role. The old INSERT policy targeted PUBLIC with
-- WITH CHECK true, allowing arbitrary notification injection through PostgREST.
DROP POLICY IF EXISTS "Service role can insert notifications"
	ON public.user_notifications;
DROP POLICY IF EXISTS "Users can read own notifications"
	ON public.user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications"
	ON public.user_notifications;

REVOKE ALL PRIVILEGES ON TABLE public.user_notifications
	FROM PUBLIC, anon, authenticated;

CREATE POLICY "Users can read own notifications"
	ON public.user_notifications
	FOR SELECT
	TO authenticated
	USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own notifications"
	ON public.user_notifications
	FOR UPDATE
	TO authenticated
	USING ((SELECT auth.uid()) = user_id)
	WITH CHECK ((SELECT auth.uid()) = user_id);

COMMIT;
