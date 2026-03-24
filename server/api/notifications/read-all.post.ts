export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const supabase = useServerSupabase()

	const { error } = await supabase
		.from('user_notifications')
		.update({ read: true })
		.eq('user_id', user.id)
		.eq('read', false)

	if (error) throw handleSupabaseError(error, 'user_notifications.read-all')

	return { success: true }
})
