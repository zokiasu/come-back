import type { NotificationsResponse } from '~/types/api'

export default defineEventHandler(async (event): Promise<NotificationsResponse> => {
	const user = await requireAuth(event)
	setHeader(event, 'Cache-Control', 'no-store')
	const query = getQuery(event)
	const page = Math.max(1, Number(query.page) || 1)
	const limit = 30
	const offset = (page - 1) * limit

	const supabase = useServerSupabase()

	const [notificationsResult, unreadResult] = await Promise.all([
		supabase
			.from('user_notifications')
			.select('id, type, title, message, artist_id, release_id, read, created_at', {
				count: 'exact',
			})
			.eq('user_id', user.id)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1),
		supabase
			.from('user_notifications')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', user.id)
			.eq('read', false),
	])

	if (notificationsResult.error) {
		throw handleSupabaseError(notificationsResult.error, 'user_notifications.select')
	}
	if (unreadResult.error) {
		throw handleSupabaseError(unreadResult.error, 'user_notifications.unread-count')
	}

	return {
		notifications: notificationsResult.data ?? [],
		total: notificationsResult.count ?? 0,
		unread: unreadResult.count ?? 0,
		page,
		limit,
	}
})
