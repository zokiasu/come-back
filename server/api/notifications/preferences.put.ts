import type { NotificationPreferences } from '~/types'

type PreferencesBody = Partial<
	Pick<
		NotificationPreferences,
		'push_enabled' | 'daily_comeback' | 'weekly_comeback' | 'followed_artist_alerts'
	>
>

export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const body = await readBody<PreferencesBody>(event)

	if (!body || typeof body !== 'object') {
		throw createBadRequestError('Corps de requête invalide')
	}

	const supabase = useServerSupabase()

	const { data, error } = await supabase
		.from('notification_preferences')
		.upsert(
			{ user_id: user.id, ...body, updated_at: new Date().toISOString() },
			{ onConflict: 'user_id' },
		)
		.select()
		.single()

	if (error) throw handleSupabaseError(error, 'notification_preferences.upsert')

	return data
})
