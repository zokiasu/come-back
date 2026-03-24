import type { NotificationPreferences } from '~/types'

export function useNotificationPreferences() {
	const { requireAuthHeaders } = useApiAuthHeaders()
	const { runMutation } = useMutationTimeout()

	const preferences = ref<NotificationPreferences | null>(null)
	const isLoading = ref(false)
	const error = ref<string | null>(null)

	const fetchPreferences = async () => {
		isLoading.value = true
		error.value = null
		try {
			preferences.value = await $fetch<NotificationPreferences>(
				'/api/notifications/preferences',
				{ headers: requireAuthHeaders() },
			)
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : 'Erreur lors du chargement des préférences'
		} finally {
			isLoading.value = false
		}
	}

	const updatePreferences = async (
		updates: Partial<
			Pick<
				NotificationPreferences,
				'push_enabled' | 'daily_comeback' | 'weekly_comeback' | 'followed_artist_alerts'
			>
		>,
	) => {
		const updated = await runMutation(
			$fetch<NotificationPreferences>('/api/notifications/preferences', {
				method: 'PUT',
				headers: requireAuthHeaders(),
				body: updates,
			}),
			'La sauvegarde des préférences a expiré.',
		)
		preferences.value = updated
		return updated
	}

	return {
		preferences,
		isLoading,
		error,
		fetchPreferences,
		updatePreferences,
	}
}
