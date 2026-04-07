import { storeToRefs } from 'pinia'
import type { SupabaseAuthUser, UserInsertData, UserUpdateData } from '~/types/auth'

// Keep auth initialization single-flight across every composable instance.
let authWatcherBound = false
let authInitialized = false
let sharedInitPromise: Promise<boolean> | null = null
let sharedTrustedAuthUserPromise: Promise<SupabaseAuthUser | null> | null = null
let sharedIsLoggingOutFlag = false

export const useAuth = () => {
	const user = useSupabaseUser()
	const supabase = useSupabaseClient()
	const userStore = useUserStore()
	const { runMutation } = useMutationTimeout()

	// Use storeToRefs to preserve reactivity
	const { userDataStore, isLoginStore, isAdminStore, supabaseUserStore } =
		storeToRefs(userStore)

	// Destructure actions directly; storeToRefs is only needed for refs.
	const { syncUserProfile, resetStore } = userStore

	const getErrorCode = (error: unknown): string | undefined => {
		if (typeof error === 'object' && error !== null && 'code' in error) {
			return (error as { code?: string }).code
		}
		return undefined
	}

	const hasMeaningfulText = (value: string | null | undefined): value is string => {
		return typeof value === 'string' && value.trim().length > 0
	}

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

	const withTimeout = <T>(
		promise: Promise<T>,
		ms: number,
		fallback: T,
	): Promise<T> => {
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
				const sessionAuthUser = await withTimeout(
					getSessionAuthUser(),
					3000,
					null,
				)
				if (sessionAuthUser?.id) return sessionAuthUser

				const { data: userData, error } = await withTimeout(
					supabase.auth.getUser(),
					3000,
					{ data: { user: null }, error: null } as Awaited<
						ReturnType<typeof supabase.auth.getUser>
					>,
				)
				const sessionUser = userData.user

				if (error || !sessionUser?.id) return null

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

	// Create or update a user profile.
	const createOrUpdateUser = async (authUser: SupabaseAuthUser): Promise<User | null> => {
		// Supabase v2 can expose a user without an id during initialization.
		if (!authUser?.id) return null

		try {
			// Check whether the user already exists.
			let existingUser: User | null = null
			let fetchError: { code?: string } | Error | null = null

			if (import.meta.dev) {
				// Development-only timeout
				const timeoutPromise = new Promise<never>((_, reject) => {
					setTimeout(() => reject(new Error('Dev database timeout')), 2000)
				})

				const fetchPromise = supabase
					.from('users')
					.select('*')
					.eq('id', authUser.id)
					.single()

				try {
					const result = await Promise.race([fetchPromise, timeoutPromise])
					existingUser = result.data as User
					fetchError = result.error
				} catch (error) {
					fetchError = error instanceof Error ? error : new Error('Unknown error')
				}
			} else {
				// Do not use a timeout in production.
				const result = await supabase
					.from('users')
					.select('*')
					.eq('id', authUser.id)
					.single()

				existingUser = result.data as User
				fetchError = result.error
			}

			if (fetchError && getErrorCode(fetchError) !== 'PGRST116') {
				console.error("Erreur lors de la récupération de l'utilisateur:", fetchError)
				throw fetchError
			}

			if (!existingUser) {
				// The local user profile creation is also a mutation flow:
				// if Supabase does not answer, auth must fail clearly instead of hanging.
				const insertData: UserInsertData = {
					id: authUser.id,
					email: authUser.email || '',
					name:
						authUser.user_metadata?.full_name ||
						authUser.user_metadata?.name ||
						'Utilisateur',
					photo_url:
						authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '',
					role: 'USER',
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				}

				const { data: newUser, error: createError } = await runMutation(
					supabase.from('users').insert([insertData]).select().single(),
					'Creating the user profile timed out. Please try again.',
				)

				if (createError) {
					console.error("Erreur lors de la création de l'utilisateur:", createError)
					const details = JSON.stringify({
						message: (createError as { message?: string }).message,
						code: (createError as { code?: string }).code,
						details: (createError as { details?: string }).details,
						hint: (createError as { hint?: string }).hint,
					})
					throw new Error(`create-user-failed: ${details}`)
				}

				return newUser as User
			} else {
				// Same idea for profile hydration updates: timeout -> explicit error,
				// no endless "logged in but not really ready" state.
				const nextEmail = hasMeaningfulText(authUser.email) ? authUser.email : null
				const nextName =
					authUser.user_metadata?.full_name || authUser.user_metadata?.name || null
				const nextPhoto =
					authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null

				const updateData: Partial<UserUpdateData> = {}

				if (!hasMeaningfulText(existingUser.email) && nextEmail) {
					updateData.email = nextEmail
				}
				if (!hasMeaningfulText(existingUser.name) && hasMeaningfulText(nextName)) {
					updateData.name = nextName
				}
				if (!hasMeaningfulText(existingUser.photo_url) && hasMeaningfulText(nextPhoto)) {
					updateData.photo_url = nextPhoto
				}

				if (!Object.keys(updateData).length) {
					return existingUser as User
				}

				updateData.id = authUser.id
				updateData.role = existingUser.role
				updateData.updated_at = new Date().toISOString()

				const { data: updatedUser, error: updateError } = await runMutation(
					supabase
						.from('users')
						.update(updateData)
						.eq('id', authUser.id)
						.select()
						.single(),
					'Updating the user profile timed out. Please try again.',
				)

				if (updateError) {
					console.error("Erreur lors de la mise à jour de l'utilisateur:", updateError)
					const details = JSON.stringify({
						message: (updateError as { message?: string }).message,
						code: (updateError as { code?: string }).code,
						details: (updateError as { details?: string }).details,
						hint: (updateError as { hint?: string }).hint,
					})
					throw new Error(`update-user-failed: ${details}`)
				}

				return updatedUser as User
			}
		} catch (error) {
			console.error('Erreur dans createOrUpdateUser:', error)
			throw error
		}
	}

	// Synchronization state
	const isSyncing = useState('auth-is-syncing', () => false)
	const syncError = useState<string | null>('auth-sync-error', () => null)

	const preserveAuthenticatedState = (authUser: SupabaseAuthUser) => {
		// Mark the client as authenticated immediately while profile hydration
		// catches up in the background.
		userStore.setSupabaseUser(authUser)
		userStore.setIsLogin(true)

		if (userDataStore.value?.id === authUser.id) {
			userStore.setIsAdmin(userDataStore.value.role === 'ADMIN')
		} else {
			userStore.setUserData(null)
			userStore.setIsAdmin(false)
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

	// Track whether the next auth change comes from an explicit sign-out.
	// Sign out the current user.
	const logout = async () => {
		try {
			sharedIsLoggingOutFlag = true
			const supabase = useSupabaseClient()
			const { error: logoutError } = await supabase.auth.signOut()

			if (logoutError) {
				throw logoutError
			}

			// Reset the store
			await resetStore()

			await navigateTo('/')
		} catch (err: unknown) {
			console.error('Erreur lors de la déconnexion:', err)
			sharedIsLoggingOutFlag = false
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
			// Keep isAdmin synchronized with the role in userDataStore
			const shouldBeAdmin = userDataStore.value.role === 'ADMIN'
			if (isAdminStore.value !== shouldBeAdmin) {
				userStore.setIsAdmin(shouldBeAdmin)
			}
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
			const shouldBeAdmin = userDataStore.value.role === 'ADMIN'
			if (isAdminStore.value !== shouldBeAdmin) {
				userStore.setIsAdmin(shouldBeAdmin)
			}
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

	if (!authWatcherBound) {
		authWatcherBound = true

		watch(
			user,
			async (newUser, oldUser) => {
				// One-time initialization at startup
				if (!authInitialized) {
					await initializeAuth()
					return
				}

				// Ignore transient Supabase v2 states where the user has no id yet.
				if (newUser && !newUser.id) {
					return
				}

				// Handle auth changes after initialization.
				if (newUser?.id && !oldUser?.id) {
					await ensureUserProfile()
				} else if (!newUser && oldUser) {
					// The Supabase user disappeared.
					// Reset only when this is a real sign-out, not when Supabase briefly
					// loses the user during a refresh while local state is still valid.
					if (sharedIsLoggingOutFlag || (!userDataStore.value && !isLoginStore.value)) {
						await resetStore()
						sharedIsLoggingOutFlag = false
					}
				} else if (newUser?.id && oldUser?.id && newUser.id !== oldUser.id) {
					await ensureUserProfile()
				}
			},
			{ immediate: true },
		)
	}

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

	return {
		user,
		userData: userDataStore,
		isLogin: isLoginStore,
		isAdmin: isAdminStore,
		supabaseUser: supabaseUserStore,
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
