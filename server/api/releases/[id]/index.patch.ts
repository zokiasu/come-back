import type { TablesUpdate } from '~/types/supabase'
import { validateBody } from '../../../utils/validation'
import { updateReleaseBodySchema } from '../../../utils/schemas'

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const releaseId = validateRouteParam(event, 'id', 'Release')
	const body = validateBody(await readBody(event), updateReleaseBodySchema)

	const supabase = useServerSupabase()

	// 1. Update the champs the release if provided
	let updatedRelease = null
	if (body.updates && Object.keys(body.updates).length > 0) {
		const { data, error } = await supabase
			.from('releases')
			.update(body.updates as TablesUpdate<'releases'>)
			.eq('id', releaseId)
			.select()
			.single()

		if (error) throw handleSupabaseError(error, 'releases.update')
		updatedRelease = data
	}

	// 2. Remplacer the artists if provided
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

	// 3. Remplacer the platform links if provided
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
