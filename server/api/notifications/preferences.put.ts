import { validateBody } from '../../utils/validation'
import { notificationPreferencesBodySchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const body = validateBody(await readBody(event), notificationPreferencesBodySchema)

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
