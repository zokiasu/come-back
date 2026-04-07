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

	// Explicitly allow only known fields so a client-provided user_id cannot
	// override the authenticated user during upsert
	const safeBody: PreferencesBody = {}
	if (body.push_enabled !== undefined) safeBody.push_enabled = body.push_enabled
	if (body.daily_comeback !== undefined) safeBody.daily_comeback = body.daily_comeback
	if (body.weekly_comeback !== undefined) safeBody.weekly_comeback = body.weekly_comeback
	if (body.followed_artist_alerts !== undefined)
		safeBody.followed_artist_alerts = body.followed_artist_alerts

	const { data, error } = await supabase
		.from('notification_preferences')
		.upsert(
			{ user_id: user.id, ...safeBody, updated_at: new Date().toISOString() },
			{ onConflict: 'user_id' },
		)
		.select()
		.single()

	if (error) throw handleSupabaseError(error, 'notification_preferences.upsert')

	return data
})
