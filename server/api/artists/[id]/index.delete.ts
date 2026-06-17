import { isError as isH3Error } from 'h3'

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const artistId = validateRouteParam(event, 'id', 'Artist')
	const query = getQuery(event)
	// Whitelist the mode: any value other than the two supported RPCs falls back to 'safe'.
	const mode = query.mode === 'simple' ? 'simple' : 'safe'

	const supabase = useServerSupabase()

	try {
		if (mode === 'simple') {
			const { data, error } = await supabase.rpc('delete_artist_simple', {
				artist_id_param: artistId,
			})

			if (error) throw handleSupabaseError(error, 'artists.delete.simple')

			return data
		}

		const { data, error } = await supabase.rpc('delete_artist_safely', {
			artist_id_param: artistId,
		})

		if (error) throw handleSupabaseError(error, 'artists.delete.safe')

		return data
	} catch (error) {
		if (isH3Error(error)) throw error
		throw createInternalError('Failed to delete artist', error)
	}
})
