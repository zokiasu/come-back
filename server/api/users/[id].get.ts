export default defineEventHandler(async (event) => {
	await requireAuth(event)
	setHeader(event, 'Cache-Control', 'private, no-store')

	const id = validateRouteParam(event, 'id', 'User')
	const supabase = useServerSupabase()
	const { data, error } = await supabase.from('users').select('*').eq('id', id).single()

	if (error) {
		if (error.code === 'PGRST116') throw createNotFoundError('User')
		throw handleSupabaseError(error, 'users.profile.read')
	}

	return data
})
