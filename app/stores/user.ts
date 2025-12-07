// store/user.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '~/types'

export const useUserStore = defineStore(
	'userStore',
	() => {
		const supabaseUserStore = ref(null)
		const isLoginStore = ref<boolean>(false)
		const isAdminStore = ref<boolean>(false)
		const userDataStore = ref<User | null>(null)

		// État d'hydratation pour éviter les erreurs SSR/client
		const isHydrated = ref(false)

		const setUserData = (user: User | null) => {
			userDataStore.value = user
			if (user) {
				setIsAdmin(user.role === 'ADMIN')
			} else {
				setIsAdmin(false)
			}
		}

		const setSupabaseUser = (user: any) => {
			supabaseUserStore.value = user
		}

		const setIsLogin = (isLogin: boolean) => {
			isLoginStore.value = isLogin
		}

		const setIsAdmin = (isAdmin: boolean) => {
			isAdminStore.value = isAdmin
		}

		const syncUserProfile = async (
			authUser: any = null,
			userData: User | null = null,
		) => {
			if (authUser && userData) {
				setUserData(userData)
				setIsLogin(true)
				setSupabaseUser(authUser)
			} else {
				setUserData(null)
				setIsLogin(false)
				setSupabaseUser(null)
			}
			isHydrated.value = true
		}

		const resetStore = () => {
			setUserData(null)
			setIsLogin(false)
			setSupabaseUser(null)
			setIsAdmin(false)
			isHydrated.value = true
		}

		// Initialisation côté client uniquement
		const initializeStore = () => {
			if (import.meta.client && !isHydrated.value) {
				// Marquer comme hydraté même si pas de données
				isHydrated.value = true
			}
		}

		return {
			supabaseUserStore,
			userDataStore,
			isLoginStore,
			isAdminStore,
			isHydrated,
			setUserData,
			setSupabaseUser,
			setIsLogin,
			setIsAdmin,
			syncUserProfile,
			resetStore,
			initializeStore,
		}
	},
	{
		persist: {
			// Clé de stockage localStorage
			key: 'userStore',
			// Note: On ne persiste pas isAdminStore car c'est une valeur dérivée de userDataStore.role
			// Elle sera recalculée lors de l'hydratation via afterHydrate
			pick: ['userDataStore', 'isLoginStore'],
			afterHydrate: (ctx) => {
				const userData = ctx.store.userDataStore
				if (userData && userData.role) {
					ctx.store.setIsAdmin(userData.role === 'ADMIN')
				} else {
					ctx.store.setIsAdmin(false)
				}
				ctx.store.isHydrated = true
			},
		},
	},
)
