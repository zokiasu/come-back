import { checkRateLimit, RATE_LIMIT_PRESETS } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
	await checkRateLimit(event, RATE_LIMIT_PRESETS.publicRead)

	const user = await requireAuth(event)
	setHeader(event, 'Cache-Control', 'private, no-store')

	const id = validateRouteParam(event, 'id', 'User')
	const supabase = useServerSupabase()

	if (id === user.id) {
		const { data, error } = await supabase.from('users').select('*').eq('id', id).single()

		if (error) {
			if (error.code === 'PGRST116') throw createNotFoundError('User')
			throw handleSupabaseError(error, 'users.profile.read')
		}

		return data
	}

	const { data, error } = await supabase
		.from('users')
		.select('id, name, photo_url, role, created_at')
		.eq('id', id)
		.single()

	if (error) {
		if (error.code === 'PGRST116') throw createNotFoundError('User')
		throw handleSupabaseError(error, 'users.profile.read')
	}

	return data
})
