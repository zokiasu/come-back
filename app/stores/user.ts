// store/user.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '~/types'
import type { SupabaseAuthUser } from '~/types/auth'

export const useUserStore = defineStore(
	'userStore',
	() => {
		const supabaseUserStore = ref<SupabaseAuthUser | null>(null)
		const isLoginStore = ref<boolean>(false)
		const isAdminStore = ref<boolean>(false)
		const userDataStore = ref<User | null>(null)

		// hydration state to avoid SSR/client mismatches
		const isHydrated = ref(false)

		const setUserData = (user: User | null) => {
			userDataStore.value = user
			if (user) {
				setIsAdmin(user.role === 'ADMIN')
			} else {
				setIsAdmin(false)
			}
		}

		const setSupabaseUser = (user: SupabaseAuthUser | null) => {
			supabaseUserStore.value = user
		}

		const setIsLogin = (isLogin: boolean) => {
			isLoginStore.value = isLogin
		}

		const setIsAdmin = (isAdmin: boolean) => {
			isAdminStore.value = isAdmin
		}

		const syncUserProfile = async (
			authUser: SupabaseAuthUser | null = null,
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

		// Initialisation client-side only
		const initializeStore = () => {
			if (import.meta.client && !isHydrated.value) {
				// Mark as hydrated even when no data is available
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
			// localStorage key
			key: 'userStore',
			// Note: isAdminStore is not persisted because it is derived from userDataStore.role
			// It is recalculated during hydration via afterHydrate
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
