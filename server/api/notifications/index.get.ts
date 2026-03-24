export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const query = getQuery(event)
	const page = Math.max(1, Number(query.page) || 1)
	const limit = 30
	const offset = (page - 1) * limit

	const supabase = useServerSupabase()

	const { data, error, count } = await supabase
		.from('user_notifications')
		.select('id, type, title, message, artist_id, release_id, read, created_at', {
			count: 'exact',
		})
		.eq('user_id', user.id)
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1)

	if (error) throw handleSupabaseError(error, 'user_notifications.select')

	return { notifications: data ?? [], total: count ?? 0, page, limit }
})
