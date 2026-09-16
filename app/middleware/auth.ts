import { resolveAuthSession, waitForAuthInitialization } from '~/utils/authSession'

export default defineNuxtRouteMiddleware(async (_to, _from) => {
	const user = useSupabaseUser()
	const supabase = useSupabaseClient()
	const userStore = useUserStore()

	// SSR: allow through; the full check runs client-side
	if (import.meta.server) {
		return
	}

	// Client: Wait for the initialisation the auth (restauration session + localStorage)
	const { ensureAuthInitialized, userData } = useAuth()

	await waitForAuthInitialization(ensureAuthInitialized)

	const { sessionUserId, sessionCheckFailed } = await resolveAuthSession(
		user.value?.id,
		() => supabase.auth.getSession(),
	)

	const hasUserProfile = !!userData.value || !!userStore.userDataStore || !!sessionUserId
	const hasPersistedSession =
		sessionCheckFailed && !!userStore.userDataStore && userStore.isLoginStore
	const isAuthenticated = !!sessionUserId || hasPersistedSession

	if (!isAuthenticated || !hasUserProfile) {
		return navigateTo('/?authError=auth_required')
	}
})
