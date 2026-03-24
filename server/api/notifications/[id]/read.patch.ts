export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const notificationId = validateRouteParam(event, 'id', 'Notification')
	const supabase = useServerSupabase()

	const { error } = await supabase
		.from('user_notifications')
		.update({ read: true })
		.eq('id', notificationId)
		.eq('user_id', user.id)

	if (error) throw handleSupabaseError(error, 'user_notifications.read')

	return { success: true }
})
