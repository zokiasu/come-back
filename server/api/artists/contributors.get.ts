export default defineEventHandler(async (event) => {
	await requireAdmin(event)
	setHeader(event, 'Cache-Control', 'private, no-store')

	const query = getQuery(event)
	const artistIds = validateArrayParam(
		typeof query.artistIds === 'string' ? query.artistIds : undefined,
		'artistIds',
	)
	if (!artistIds?.length) return []

	const supabase = useServerSupabase()
	const { data, error } = await supabase
		.from('user_artist_contributions')
		.select(
			`
				*,
				user:users!user_artist_contributions_user_id_fkey(
					id,
					name,
					email,
					photo_url
				)
			`,
		)
		.in('artist_id', artistIds)
		.eq('contribution_type', 'CREATOR')

	if (error) throw handleSupabaseError(error, 'artists.contributors')
	return data ?? []
})
