export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const body = await readBody<{ endpoint: string }>(event)

	if (!body?.endpoint) {
		throw createBadRequestError('endpoint est requis')
	}

	const supabase = useServerSupabase()

	const { error } = await supabase
		.from('push_subscriptions')
		.delete()
		.eq('user_id', user.id)
		.eq('endpoint', body.endpoint)

	if (error) throw handleSupabaseError(error, 'push_subscriptions.delete')

	// Set push_enabled to false when no subscriptions remain
	const { count } = await supabase
		.from('push_subscriptions')
		.select('id', { count: 'exact', head: true })
		.eq('user_id', user.id)

	if (count === 0) {
		await supabase
			.from('notification_preferences')
			.update({ push_enabled: false, updated_at: new Date().toISOString() })
			.eq('user_id', user.id)
	}

	return { success: true }
})
