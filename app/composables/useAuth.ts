import { storeToRefs } from 'pinia'
import type { SupabaseAuthUser, UserInsertData, UserUpdateData } from '~/types/auth'

export const useAuth = () => {
	const user = useSupabaseUser()
	const supabase = useSupabaseClient()
	const userStore = useUserStore()

	// Utiliser storeToRefs pour préserver la réactivité
	const { userDataStore, isLoginStore, isAdminStore, supabaseUserStore } =
		storeToRefs(userStore)

	// Destructurer les actions (pas besoin de storeToRefs pour les fonctions)
	const { syncUserProfile, resetStore } = userStore

	const getErrorCode = (error: unknown): string | undefined => {
		if (typeof error === 'object' && error !== null && 'code' in error) {
			return (error as { code?: string }).code
		}
		return undefined
	}

	const getSessionAuthUser = async (): Promise<SupabaseAuthUser | null> => {
		const { data: sessionData } = await supabase.auth.getSession()
		const sessionUser = sessionData.session?.user

		if (!sessionUser?.id) return null

		return {
			id: sessionUser.id,
			email: sessionUser.email,
			user_metadata: sessionUser.user_metadata ?? {},
		}
	}

	// Fonction pour créer ou mettre à jour un utilisateur (intégrée depuis useSupabaseUserManager)
	const createOrUpdateUser = async (authUser: SupabaseAuthUser): Promise<User | null> => {
		// Vérifier que l'utilisateur et son ID sont définis (Supabase v2 peut retourner un user sans id pendant l'init)
		if (!authUser?.id) return null

		try {
			// Vérifier si l'utilisateur existe déjà
			let existingUser: User | null = null
			let fetchError: { code?: string } | Error | null = null

			if (import.meta.dev) {
				// Timeout uniquement en développement
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
				// Pas de timeout en production
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
				// Créer un nouvel utilisateur
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

				const { data: newUser, error: createError } = await supabase
					.from('users')
					.insert([insertData])
					.select()
					.single()

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
				// Mettre à jour l'utilisateur existant
				const updateData: UserUpdateData = {
					id: authUser.id,
					email: authUser.email || existingUser.email,
					name:
						authUser.user_metadata?.full_name ||
						authUser.user_metadata?.name ||
						existingUser.name,
					photo_url:
						authUser.user_metadata?.avatar_url ||
						authUser.user_metadata?.picture ||
						existingUser.photo_url ||
						'',
					role: existingUser.role,
					updated_at: new Date().toISOString(),
				}

				const { data: updatedUser, error: updateError } = await supabase
					.from('users')
					.update(updateData)
					.eq('id', authUser.id)
					.select()
					.single()

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

	// État de synchronisation
	const isSyncing = ref(false)
	const syncError = ref<string | null>(null)

	const preserveAuthenticatedState = (authUser: SupabaseAuthUser) => {
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

	// Fonction pour synchroniser le profil utilisateur
	const ensureUserProfile = async () => {
		// Attendre que l'utilisateur soit complètement initialisé (avec id)
		// Supabase v2 peut avoir un user.value sans id pendant l'initialisation OAuth
		if (!user.value?.id) {
			const authUser = await getSessionAuthUser()

			if (authUser?.id) {
				preserveAuthenticatedState(authUser)

				if (userDataStore.value?.id === authUser.id && isLoginStore.value) {
					preserveAuthenticatedState(authUser)
					return true
				}

				return await syncUserProfileFromAuthUser(authUser)
			}

			// Ne pas réinitialiser si on a déjà des données valides dans le store
			if (userDataStore.value && isLoginStore.value) {
				return true
			}
			await resetStore()
			return false
		}

		// Si l'utilisateur Supabase existe mais qu'on n'a pas de données dans le store
		// ou si l'ID ne correspond pas, on re-synchronise
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
				const errorMessage = error instanceof Error ? error.message : 'Erreur de synchronisation'
				console.error('❌ Erreur lors de la synchronisation:', error)
				syncError.value = errorMessage
				preserveAuthenticatedState(authUser)
				return true
			} finally {
				isSyncing.value = false
			}
		}

		// Si tout est déjà synchronisé
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
			const errorMessage = error instanceof Error ? error.message : 'Erreur de synchronisation'
			console.error('❌ Erreur lors de la synchronisation (auth user):', error)
			syncError.value = errorMessage
			preserveAuthenticatedState(authUser)
			return true
		} finally {
			isSyncing.value = false
		}
	}

	// Flag pour indiquer une déconnexion volontaire
	let isLoggingOutFlag = false

	// Fonction de déconnexion
	const logout = async () => {
		try {
			isLoggingOutFlag = true
			const supabase = useSupabaseClient()
			const { error: logoutError } = await supabase.auth.signOut()

			if (logoutError) {
				throw logoutError
			}

			// Réinitialiser le store
			await resetStore()

			await navigateTo('/')
		} catch (err: unknown) {
			console.error('Erreur lors de la déconnexion:', err)
			isLoggingOutFlag = false
		}
	}

	// Fonction d'initialisation au chargement de l'app
	const initializeAuth = async () => {
		// Si on a un utilisateur Supabase complet (avec id) et des données dans le store
		if (
			user.value?.id &&
			userDataStore.value &&
			userDataStore.value.id === user.value.id
		) {
			// S'assurer que isAdmin est synchronisé avec le rôle dans userDataStore
			const shouldBeAdmin = userDataStore.value.role === 'ADMIN'
			if (isAdminStore.value !== shouldBeAdmin) {
				userStore.setIsAdmin(shouldBeAdmin)
			}
			return true
		}

		// Si on a un utilisateur Supabase complet mais pas de données dans le store
		if (user.value?.id) {
			return await ensureUserProfile()
		}

		const sessionAuthUser = await getSessionAuthUser()
		if (sessionAuthUser?.id) {
			preserveAuthenticatedState(sessionAuthUser)
			return await syncUserProfileFromAuthUser(sessionAuthUser)
		}

		// Si on a des données valides dans le store (restaurées depuis localStorage)
		// mais que Supabase n'est pas encore initialisé, on garde ces données
		if (userDataStore.value && isLoginStore.value) {
			const shouldBeAdmin = userDataStore.value.role === 'ADMIN'
			if (isAdminStore.value !== shouldBeAdmin) {
				userStore.setIsAdmin(shouldBeAdmin)
			}
			return true
		}

		// Aucun utilisateur connecté et pas de données dans le store
		await resetStore()
		return false
	}

	// Watcher pour surveiller les changements d'utilisateur Supabase
	let isInitialized = false
	let initPromise: Promise<boolean> | null = null

	watch(
		user,
		async (newUser, oldUser) => {
			// Initialisation une seule fois au démarrage
			if (!isInitialized) {
				isInitialized = true
				initPromise = initializeAuth()
				await initPromise
				return
			}

			// Ignorer les changements si l'utilisateur n'a pas d'id (état intermédiaire Supabase v2)
			if (newUser && !newUser.id) {
				return
			}

			// Gestion des changements d'utilisateur après l'initialisation
			if (newUser?.id && !oldUser?.id) {
				await ensureUserProfile()
			} else if (!newUser && oldUser) {
				// L'utilisateur Supabase a disparu
				// Ne réinitialiser que si c'est une vraie déconnexion (pas une race condition au refresh)
				if (isLoggingOutFlag || (!userDataStore.value && !isLoginStore.value)) {
					await resetStore()
					isLoggingOutFlag = false
				}
			} else if (newUser?.id && oldUser?.id && newUser.id !== oldUser.id) {
				await ensureUserProfile()
			}
		},
		{ immediate: true },
	)

	// Fonction pour s'assurer que l'auth est initialisée (pour les middlewares)
	const ensureAuthInitialized = async (): Promise<boolean> => {
		// Si déjà initialisé, retourner immédiatement
		if (isInitialized) {
			return true
		}

		// Si une initialisation est en cours, l'attendre
		if (initPromise) {
			await initPromise
			return true
		}

		// Sinon démarrer l'initialisation
		initPromise = initializeAuth()
		await initPromise
		return true
	}

	return {
		// États
		user,
		userData: userDataStore,
		isLogin: isLoginStore,
		isAdmin: isAdminStore,
		supabaseUser: supabaseUserStore,
		isSyncing: readonly(isSyncing),
		syncError: readonly(syncError),

		// Actions
		ensureUserProfile,
		syncUserProfileFromAuthUser,
		initializeAuth,
		ensureAuthInitialized,
		logout,
	}
}
