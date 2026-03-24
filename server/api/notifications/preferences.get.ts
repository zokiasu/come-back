import type { NotificationPreferences } from '~/types'

const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'user_id'> = {
	push_enabled: false,
	daily_comeback: true,
	weekly_comeback: true,
	followed_artist_alerts: true,
	updated_at: null,
}

export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const supabase = useServerSupabase()

	const { data, error } = await supabase
		.from('notification_preferences')
		.select('*')
		.eq('user_id', user.id)
		.maybeSingle()

	if (error) throw handleSupabaseError(error, 'notification_preferences.get')

	return data ?? { user_id: user.id, ...DEFAULT_PREFERENCES }
})
