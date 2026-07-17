import { validateBody } from '../../utils/validation'
import { pushSubscribeBodySchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const body = validateBody(await readBody(event), pushSubscribeBodySchema)

	const supabase = useServerSupabase()

	const { error } = await supabase.from('push_subscriptions').upsert(
		{
			user_id: user.id,
			endpoint: body.endpoint,
			p256dh: body.p256dh,
			auth: body.auth,
			user_agent: body.userAgent ?? null,
		},
		{ onConflict: 'endpoint' },
	)

	if (error) throw handleSupabaseError(error, 'push_subscriptions.upsert')

	// Create or update preferences to ensure push_enabled is true
	// (ignoreDuplicates would be incorrect: a user who subscribes again after disabling notifications
	// must get push_enabled=true even if the row already exists)
	await supabase
		.from('notification_preferences')
		.upsert({ user_id: user.id, push_enabled: true }, { onConflict: 'user_id' })

	return { success: true }
})
