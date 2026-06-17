import { storeToRefs } from 'pinia'
import type { SupabaseAuthUser } from '~/types/auth'
import { upsertUserProfile } from './Supabase/helpers/user/upsertUserProfile'

// Keep auth initialization single-flight across every composable instance.
let authInitialized = false
let sharedInitPromise: Promise<boolean> | null = null
let sharedTrustedAuthUserPromise: Promise<SupabaseAuthUser | null> | null = null

export const useAuth = () => {
	const user = useSupabaseUser()
	const supabase = useSupabaseClient()
	const userStore = useUserStore()
	const { runMutation } = useMutationTimeout()

	// Use storeToRefs to preserve reactivity
	const { userDataStore, isLoginStore, isAdminStore } = storeToRefs(userStore)

	// Destructure actions directly; storeToRefs is only needed for refs.
	const { syncUserProfile, resetStore } = userStore

	const getSessionAuthUser = async (): Promise<SupabaseAuthUser | null> => {
		const { data } = await supabase.auth.getSession()
		const sessionUser = data.session?.user

		if (!sessionUser?.id) return null

		return {
			id: sessionUser.id,
			email: sessionUser.email,
			user_metadata: sessionUser.user_metadata ?? {},
		}
	}

	const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
		return Promise.race([
			promise,
			new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
		])
	}

	const getTrustedAuthUser = async (): Promise<SupabaseAuthUser | null> => {
		if (sharedTrustedAuthUserPromise) {
			return await sharedTrustedAuthUserPromise
		}

		sharedTrustedAuthUserPromise = (async () => {
			try {
				// Prefer the session snapshot first because it is cheaper and avoids
				// some transient `getUser()` races during refresh or OAuth redirects.
				const sessionAuthUser = await withTimeout(getSessionAuthUser(), 3000, null)
				if (sessionAuthUser?.id) return sessionAuthUser

				const result = await withTimeout(supabase.auth.getUser(), 3000, null)
				if (!result || result.error || !result.data.user?.id) return null
				const sessionUser = result.data.user

				return {
					id: sessionUser.id,
					email: sessionUser.email,
					user_metadata: sessionUser.user_metadata ?? {},
				}
			} catch (error) {
				console.warn('Unable to read auth session safely:', error)
				return null
			} finally {
				sharedTrustedAuthUserPromise = null
			}
		})()

		return await sharedTrustedAuthUserPromise
	}

	// Create or update the application profile. Delegates to the shared helper so
	// this composable and the OAuth callback never diverge in their upsert logic.
	const createOrUpdateUser = (authUser: SupabaseAuthUser): Promise<User | null> =>
		upsertUserProfile(supabase, authUser, runMutation)

	// Synchronization state
	const isSyncing = useState('auth-is-syncing', () => false)
	const syncError = useState<string | null>('auth-sync-error', () => null)

	const preserveAuthenticatedState = (authUser: SupabaseAuthUser) => {
		// Mark the client as authenticated immediately while profile hydration
		// catches up in the background. The live session user comes from
		// useSupabaseUser(); we no longer mirror it into the store.
		userStore.setIsLogin(true)

		// isAdmin derives from the profile automatically; only drop a stale profile
		// that belongs to a different user.
		if (userDataStore.value?.id !== authUser.id) {
			userStore.setUserData(null)
		}

		userStore.isHydrated = true
	}

	// Sync the user profile
	const ensureUserProfile = async () => {
		// Wait until the user is fully initialized (with an id)
		// Supabase v2 can expose user.value without an id during OAuth initialization.
		if (!user.value?.id) {
			// Before clearing local auth state, probe the session directly to avoid
			// logging users out during short-lived Supabase initialization gaps.
			const authUser = await getTrustedAuthUser()

			if (authUser?.id) {
				preserveAuthenticatedState(authUser)

				if (userDataStore.value?.id === authUser.id && isLoginStore.value) {
					preserveAuthenticatedState(authUser)
					return true
				}

				return await syncUserProfileFromAuthUser(authUser)
			}

			// Do not reset when valid data already exists in the store
			if (userDataStore.value && isLoginStore.value) {
				return true
			}
			await resetStore()
			return false
		}

		// Re-sync when a Supabase user exists but the local store is missing data,
		// or when the stored id no longer matches the auth user.
		if (!userDataStore.value || userDataStore.value.id !== user.value.id) {
			const authUser: SupabaseAuthUser = {
				id: user.value.id,
				email: user.value.email,
				user_metadata: user.value.user_metadata,
			}

			try {
				isSyncing.value = true
				syncError.value = null

				const userData = await createOrUpdateUser(authUser)
				await syncUserProfile(authUser, userData)

				return true
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error ? error.message : 'Erreur de synchronisation'
				console.error('❌ Erreur lors de la synchronisation:', error)
				syncError.value = errorMessage
				preserveAuthenticatedState(authUser)
				return true
			} finally {
				isSyncing.value = false
			}
		}

		// If everything is already synchronized
		if (userDataStore.value && isLoginStore.value) {
			return true
		}

		return false
	}

	const syncUserProfileFromAuthUser = async (authUser: SupabaseAuthUser) => {
		if (!authUser?.id) return false
		try {
			isSyncing.value = true
			syncError.value = null
			preserveAuthenticatedState(authUser)
			const userData = await createOrUpdateUser(authUser)
			await syncUserProfile(authUser, userData)
			return true
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : 'Erreur de synchronisation'
			console.error('❌ Erreur lors de la synchronisation (auth user):', error)
			syncError.value = errorMessage
			preserveAuthenticatedState(authUser)
			return true
		} finally {
			isSyncing.value = false
		}
	}

	// Sign out the current user. Always clear local state and leave, even if the
	// remote signOut fails, to avoid a zombie "logged-in locally but signed-out
	// remotely" state.
	const logout = async () => {
		const supabase = useSupabaseClient()
		try {
			await supabase.auth.signOut()
		} catch (err: unknown) {
			console.error('Erreur lors de la déconnexion:', err)
		} finally {
			await resetStore()
			await navigateTo('/')
		}
	}

	// Initialize auth state when the app starts.
	const runInitializeAuth = async () => {
		// Reuse store data when Supabase already has a complete user.
		if (
			user.value?.id &&
			userDataStore.value &&
			userDataStore.value.id === user.value.id
		) {
			// Profile already matches the session; isAdmin derives automatically.
			return true
		}

		// Sync the profile when Supabase has a complete user but the store is empty.
		if (user.value?.id) {
			return await ensureUserProfile()
		}

		const sessionAuthUser = await getTrustedAuthUser()
		if (sessionAuthUser?.id) {
			preserveAuthenticatedState(sessionAuthUser)
			return await syncUserProfileFromAuthUser(sessionAuthUser)
		}

		// if on a valid data in the store (restored from localStorage)
		// but Supabase is still not initialized, keep this data
		if (userDataStore.value && isLoginStore.value) {
			return true
		}

		// No signed-in user and no data in the store
		await resetStore()
		return false
	}

	const initializeAuth = async (): Promise<boolean> => {
		if (sharedInitPromise) {
			return await sharedInitPromise
		}

		sharedInitPromise = (async () => {
			try {
				return await withTimeout(runInitializeAuth(), 8000, false)
			} finally {
				authInitialized = true
				sharedInitPromise = null
			}
		})()

		return await sharedInitPromise
	}

	// The single reactive auth subscriber lives in the auth-init plugin
	// (supabase.auth.onAuthStateChange). It is the sole writer reacting to auth
	// events; every user-ref change corresponds to such an event, so a duplicate
	// watch(user) here would only double the sync cascade. Startup init is driven
	// by the plugin's initializeAuth() call, and middlewares fall back to
	// ensureAuthInitialized().

	// Ensure auth is initialized (for the middlewares)
	const ensureAuthInitialized = async (): Promise<boolean> => {
		// Wait if initialization is already in progress
		if (sharedInitPromise) {
			await sharedInitPromise
			return true
		}

		// Return immediately when already initialized
		if (authInitialized) {
			return true
		}

		// Otherwise start initialization
		await initializeAuth()
		return true
	}

	// Single source of truth for "is this user authenticated", combining the live
	// Supabase session with the (hydrated) persisted store. Every consumer should
	// read this instead of re-deriving the union locally.
	const isReady = computed(() => userStore.isHydrated)
	const isLoggedIn = computed(
		() => !!user.value?.id || (userStore.isHydrated && isLoginStore.value),
	)

	return {
		user,
		userData: userDataStore,
		isLogin: isLoginStore,
		isAdmin: isAdminStore,
		isLoggedIn,
		isReady,
		isSyncing: readonly(isSyncing),
		syncError: readonly(syncError),

		ensureUserProfile,
		syncUserProfileFromAuthUser,
		initializeAuth,
		ensureAuthInitialized,
		getTrustedAuthUser,
		logout,
	}
}
