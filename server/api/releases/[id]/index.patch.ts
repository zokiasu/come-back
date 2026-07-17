import type { TablesUpdate } from '~/types/supabase'
import { assertCanSetVerified, validateBody } from '../../../utils/validation'
import { updateReleaseBodySchema } from '../../../utils/schemas'

export default defineEventHandler(async (event) => {
	const user = await requireContributor(event)

	const releaseId = validateRouteParam(event, 'id', 'Release')
	const body = validateBody(await readBody(event), updateReleaseBodySchema)
	assertCanSetVerified(user, body.updates?.verified)

	const supabase = useServerSupabase()

	// 1. Update the release fields if provided
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

	// 2. Replace the artists if provided
	if (body.artistIds !== undefined) {
		const { error } = await supabase.rpc('replace_release_artists', {
			p_release_id: releaseId,
			p_artist_ids: body.artistIds,
		})

		if (error) throw handleSupabaseError(error, 'releases.update.artists')
	}

	// 3. Replace the platform links if provided
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
