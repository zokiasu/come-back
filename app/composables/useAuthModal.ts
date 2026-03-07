export const useAuthModal = () => {
	const isOpen = useState('authModalOpen', () => false)

	const open = async () => {
		if (import.meta.client) {
			const supabase = useSupabaseClient()
			const { data: sessionData } = await supabase.auth.getSession()
			const sessionUser = sessionData.session?.user

			if (sessionUser?.id) {
				const { syncUserProfileFromAuthUser } = useAuth()
				await syncUserProfileFromAuthUser({
					id: sessionUser.id,
					email: sessionUser.email,
					user_metadata: sessionUser.user_metadata,
				})
				isOpen.value = false
				return
			}
		}

		isOpen.value = true
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
