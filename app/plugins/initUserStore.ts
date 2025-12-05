import { useUserStore } from '@/stores/user'

export default defineNuxtPlugin(() => {
	const user = useSupabaseUser()
	const userStore = useUserStore()

	userStore.setSupabaseUser(user.value)
	userStore.setIsLogin(!!user.value)
})
