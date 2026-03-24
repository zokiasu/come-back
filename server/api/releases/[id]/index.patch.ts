import type { TablesInsert, TablesUpdate } from '~/types/supabase'

interface UpdateReleaseBody {
	updates?: TablesUpdate<'releases'>
	artistIds?: string[]
	platformLinks?: Omit<TablesInsert<'release_platform_links'>, 'release_id'>[]
}

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const releaseId = validateRouteParam(event, 'id', 'Release')
	const body = await readBody<UpdateReleaseBody>(event)

	if (!body) {
		throw createBadRequestError('Request body is required')
	}

	const supabase = useServerSupabase()

	// 1. Mettre à jour les champs de la release si fournis
	let updatedRelease = null
	if (body.updates && Object.keys(body.updates).length > 0) {
		const { data, error } = await supabase
			.from('releases')
			.update(body.updates)
			.eq('id', releaseId)
			.select()
			.single()

		if (error) throw handleSupabaseError(error, 'releases.update')
		updatedRelease = data
	}

	// 2. Remplacer les artistes si fournis
	if (body.artistIds !== undefined) {
		const { error: deleteError } = await supabase
			.from('artist_releases')
			.delete()
			.eq('release_id', releaseId)

		if (deleteError)
			throw handleSupabaseError(deleteError, 'releases.update.artists.delete')

		if (body.artistIds.length > 0) {
			const { error: insertError } = await supabase.from('artist_releases').insert(
				body.artistIds.map((artistId, index) => ({
					release_id: releaseId,
					artist_id: artistId,
					is_primary: index === 0,
				})),
			)

			if (insertError)
				throw handleSupabaseError(insertError, 'releases.update.artists.insert')
		}
	}

	// 3. Remplacer les liens de plateformes si fournis
	if (body.platformLinks !== undefined) {
		const { error: deleteError } = await supabase
			.from('release_platform_links')
			.delete()
			.eq('release_id', releaseId)

		if (deleteError) {
			console.error('Error deleting platform links:', deleteError)
		} else if (body.platformLinks.length > 0) {
			const { error: insertError } = await supabase
				.from('release_platform_links')
				.insert(body.platformLinks.map((link) => ({ ...link, release_id: releaseId })))

			if (insertError) {
				console.error('Error inserting platform links:', insertError)
			}
		}
	}

	return updatedRelease ?? { id: releaseId }
})
