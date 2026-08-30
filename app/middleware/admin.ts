import { ADMIN_AUTH_INIT_TIMEOUT_MS, AUTH_MAX_WAIT_TIME_MS } from '~/constants/auth'

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

	// Wait for the initialisation the auth (restauration session + localStorage)
	try {
		await Promise.race([
			ensureAuthInitialized(),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Auth timeout')), ADMIN_AUTH_INIT_TIMEOUT_MS),
			),
		])
	} catch {
		// On timeout, continue with the remaining checks
	}

	// Wait until user data is available (from Supabase sync or from localStorage
	// through Pinia). Reactive wait: resolves as soon as the data lands instead of
	// polling on a fixed interval, and is capped so a stuck sync cannot hang the route.
	if (!userData.value && !userStore.userDataStore) {
		await new Promise<void>((resolve) => {
			const stop = watch(
				() => userData.value || userStore.userDataStore,
				(value) => {
					if (value) {
						stop()
						resolve()
					}
				},
			)
			setTimeout(() => {
				stop()
				resolve()
			}, AUTH_MAX_WAIT_TIME_MS)
		})
	}

	let sessionUserId = user.value?.id ?? null
	let sessionCheckFailed = false

	if (!sessionUserId) {
		try {
			const { data } = await supabase.auth.getSession()
			sessionUserId = data.session?.user?.id ?? null
		} catch {
			sessionCheckFailed = true
		}
	}

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
