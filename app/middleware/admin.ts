import { ADMIN_AUTH_INIT_TIMEOUT_MS } from '~/constants/auth'
import {
	resolveAuthSession,
	waitForAuthInitialization,
	waitForUserData,
} from '~/utils/authSession'

export default defineNuxtRouteMiddleware(async (_to, _from) => {
	const user = useSupabaseUser()
	const supabase = useSupabaseClient()
	const userStore = useUserStore()

	// SSR: allow through; the full check runs client-side
	// Dashboard pages run in SPA mode (ssr: false), so this code should not execute
	if (import.meta.server) {
		return
	}

	// client-side checks
	const { ensureAuthInitialized, userData } = useAuth()

	await waitForAuthInitialization(ensureAuthInitialized, ADMIN_AUTH_INIT_TIMEOUT_MS)

	// Wait until user data is available (from Supabase sync or from localStorage
	// through Pinia). Reactive wait: resolves as soon as the data lands instead of
	// polling on a fixed interval, and is capped so a stuck sync cannot hang the route.
	await waitForUserData(() => userData.value || userStore.userDataStore)

	const { sessionUserId, sessionCheckFailed } = await resolveAuthSession(
		user.value?.id,
		() => supabase.auth.getSession(),
	)

	// Persisted state is only a fallback when the session service is temporarily
	// unavailable. A successful empty session check invalidates stale local data.
	const isAuthenticated =
		!!sessionUserId ||
		(sessionCheckFailed && !!userStore.userDataStore && userStore.isLoginStore)

	if (!isAuthenticated) {
		return navigateTo('/?authError=auth_required')
	}

	// Check the permissions admin
	const isAdmin = userStore.isAdminStore || userData.value?.role === 'ADMIN'

	if (!isAdmin) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Accès refusé. Permissions administrateur requises.',
		})
	}
})
