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
		}

		const resetStore = () => {
			setUserData(null)
			setIsLogin(false)
			setSupabaseUser(null)
			setIsAdmin(false)
		}

		return {
			supabaseUserStore,
			userDataStore,
			isLoginStore,
			isAdminStore,
			setUserData,
			setSupabaseUser,
			setIsLogin,
			setIsAdmin,
			syncUserProfile,
			resetStore,
		}
	},
	{
		persist: {
			storage: import.meta.client ? localStorage : undefined,
			// @ts-expect-error - paths is a valid option for pinia-plugin-persistedstate
			paths: ['userDataStore', 'isLoginStore', 'isAdminStore'],
			// On ne persiste pas supabaseUserStore car il contient des données sensibles
			// et Supabase gère sa propre persistance via les cookies
		},
	},
)
