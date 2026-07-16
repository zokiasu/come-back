import type { TablesUpdate } from '~/types/supabase'
import { validateBody } from '../../../utils/validation'
import { updateMusicBodySchema } from '../../../utils/schemas'

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const musicId = validateRouteParam(event, 'id', 'Music')
	const body = validateBody(await readBody(event), updateMusicBodySchema)

	const supabase = useServerSupabase()

	// 1. Update the champs if provided
	let updatedMusic = null
	if (body.updates && Object.keys(body.updates).length > 0) {
		const { data, error } = await supabase
			.from('musics')
			.update(body.updates as TablesUpdate<'musics'>)
			.eq('id', musicId)
			.select()
			.single()

		if (error) throw handleSupabaseError(error, 'musics.update')
		updatedMusic = data
	}

	// 2. Remplacer the artists if provided
	if (body.artistIds !== undefined) {
		const { error: deleteError } = await supabase
			.from('music_artists')
			.delete()
			.eq('music_id', musicId)

		if (deleteError)
			throw handleSupabaseError(deleteError, 'musics.update.artists.delete')

		if (body.artistIds.length > 0) {
			const { error: insertError } = await supabase.from('music_artists').insert(
				body.artistIds.map((artistId) => ({
					music_id: musicId,
					artist_id: artistId,
				})),
			)

			if (insertError)
				throw handleSupabaseError(insertError, 'musics.update.artists.insert')
		}
	}

	// 3. Remplacer the releases if provided
	if (body.releaseIds !== undefined) {
		const { error: deleteError } = await supabase
			.from('music_releases')
			.delete()
			.eq('music_id', musicId)

		if (deleteError)
			throw handleSupabaseError(deleteError, 'musics.update.releases.delete')

		if (body.releaseIds.length > 0) {
			const { error: insertError } = await supabase.from('music_releases').insert(
				body.releaseIds.map((releaseId) => ({
					music_id: musicId,
					release_id: releaseId,
					track_number: 0,
				})),
			)

			if (insertError)
				throw handleSupabaseError(insertError, 'musics.update.releases.insert')
		}
	}

	return updatedMusic ?? { id: musicId }
})
