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
	const { syncUserProfile, setUserData, setIsLogin, setSupabaseUser, resetStore } =
		userStore

	// Fonction pour créer ou mettre à jour un utilisateur (intégrée depuis useSupabaseUserManager)
	const createOrUpdateUser = async (authUser: SupabaseAuthUser): Promise<User | null> => {
		// Vérifier que l'utilisateur et son ID sont définis (Supabase v2 peut retourner un user sans id pendant l'init)
		if (!authUser?.id) return null

		try {
			// Vérifier si l'utilisateur existe déjà
			let existingUser: User | null = null
			let fetchError: any = null

			if (process.dev) {
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
					fetchError = error
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

			if (fetchError && fetchError.code !== 'PGRST116') {
				console.error("Erreur lors de la récupération de l'utilisateur:", fetchError)
				throw fetchError
			}

			const userData: UserInsertData | UserUpdateData = {
				id: authUser.id,
				email: authUser.email || '',
				name:
					authUser.user_metadata?.full_name ||
					authUser.user_metadata?.name ||
					'Utilisateur',
				photo_url:
					authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '',
				role: existingUser?.role || 'USER',
				updated_at: new Date().toISOString(),
			}

			if (!existingUser) {
				// Créer un nouvel utilisateur
				const insertData: UserInsertData = {
					...userData,
					created_at: new Date().toISOString(),
				}

				const { data: newUser, error: createError } = await supabase
					.from('users')
					.insert([insertData])
					.select()
					.single()

				if (createError) {
					console.error("Erreur lors de la création de l'utilisateur:", createError)
					throw createError
				}

				return newUser as User
			} else {
				// Mettre à jour l'utilisateur existant
				const { data: updatedUser, error: updateError } = await supabase
					.from('users')
					.update(userData as UserUpdateData)
					.eq('id', authUser.id)
					.select()
					.single()

				if (updateError) {
					console.error("Erreur lors de la mise à jour de l'utilisateur:", updateError)
					throw updateError
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

	// Fonction pour synchroniser le profil utilisateur
	const ensureUserProfile = async () => {
		// Attendre que l'utilisateur soit complètement initialisé (avec id)
		// Supabase v2 peut avoir un user.value sans id pendant l'initialisation OAuth
		if (!user.value?.id) {
			await resetStore()
			return false
		}

		// Si l'utilisateur Supabase existe mais qu'on n'a pas de données dans le store
		// ou si l'ID ne correspond pas, on re-synchronise
		if (!userDataStore.value || userDataStore.value.id !== user.value.id) {
			try {
				isSyncing.value = true
				syncError.value = null

				const userData = await createOrUpdateUser(user.value)
				await syncUserProfile(user.value, userData)

				return true
			} catch (error: any) {
				console.error('❌ Erreur lors de la synchronisation:', error)
				syncError.value = error.message || 'Erreur de synchronisation'
				await resetStore()
				return false
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

	// Fonction de déconnexion
	const logout = async () => {
		try {
			const supabase = useSupabaseClient()
			const { error: logoutError } = await supabase.auth.signOut()

			if (logoutError) {
				throw logoutError
			}

			// Réinitialiser le store
			await resetStore()

			await navigateTo('/authentification')
		} catch (err: unknown) {
			console.error('Erreur lors de la déconnexion:', err)
		}
	}

	// Fonction d'initialisation au chargement de l'app
	const initializeAuth = async () => {
		// Si on a un utilisateur Supabase complet (avec id) et des données dans le store
		if (user.value?.id && userDataStore.value && userDataStore.value.id === user.value.id) {
			return true
		}

		// Si on a un utilisateur Supabase complet mais pas de données dans le store
		if (user.value?.id) {
			return await ensureUserProfile()
		}

		// Aucun utilisateur connecté ou utilisateur incomplet
		await resetStore()
		return false
	}

	// Watcher pour surveiller les changements d'utilisateur Supabase
	let isInitialized = false
	let initPromise: Promise<any> | null = null

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
				await resetStore()
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
		initializeAuth,
		ensureAuthInitialized,
		logout,
	}
}
