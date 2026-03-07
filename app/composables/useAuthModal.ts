export const useAuthModal = () => {
	const isOpen = useState('authModalOpen', () => false)
	const supabaseUser = useSupabaseUser()

	const open = async () => {
		if (supabaseUser.value?.id) {
			isOpen.value = false
			return
		}

		isOpen.value = true

		try {
			if (import.meta.client) {
				const supabase = useSupabaseClient()
				const { data: sessionData } = await supabase.auth.getSession()
				const sessionUser = sessionData.session?.user

				if (sessionUser?.id) {
					const { syncUserProfileFromAuthUser } = useAuth()
					await syncUserProfileFromAuthUser({
						id: sessionUser.id,
						email: sessionUser.email,
						user_metadata: sessionUser.user_metadata ?? {},
					})
					isOpen.value = false
				}
			}
		} catch (error) {
			console.error('Error while opening auth modal:', error)
		}
	}

	const close = () => {
		isOpen.value = false
	}

	return {
		isOpen,
		open,
		close,
	}
}
