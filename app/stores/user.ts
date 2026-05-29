// store/user.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User } from '~/types'
import type { SupabaseAuthUser } from '~/types/auth'

export const useUserStore = defineStore(
	'userStore',
	() => {
		const supabaseUserStore = ref<SupabaseAuthUser | null>(null)
		const isLoginStore = ref<boolean>(false)
		const userDataStore = ref<User | null>(null)

		// Purely derived from the profile role. Never written directly, so it can
		// never desync from userDataStore.role.
		const isAdminStore = computed(() => userDataStore.value?.role === 'ADMIN')

		// hydration state to avoid SSR/client mismatches
		const isHydrated = ref(false)

		const setUserData = (user: User | null) => {
			userDataStore.value = user
		}

		const setSupabaseUser = (user: SupabaseAuthUser | null) => {
			supabaseUserStore.value = user
		}

		const setIsLogin = (isLogin: boolean) => {
			isLoginStore.value = isLogin
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
			syncUserProfile,
			resetStore,
			initializeStore,
		}
	},
	{
		persist: {
			// localStorage key
			key: 'userStore',
			// isAdminStore is a derived getter (never persisted); it recomputes
			// automatically once userDataStore is rehydrated.
			pick: ['userDataStore', 'isLoginStore'],
			afterHydrate: (ctx) => {
				ctx.store.isHydrated = true
			},
		},
	},
)
