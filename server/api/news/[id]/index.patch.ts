import type { TablesUpdate } from '~/types/supabase'
import { assertCanSetVerified, validateBody } from '../../../utils/validation'
import { updateNewsBodySchema } from '../../../utils/schemas'

export default defineEventHandler(async (event) => {
	const user = await requireContributor(event)

	const newsId = validateRouteParam(event, 'id', 'News')
	const body = validateBody(await readBody(event), updateNewsBodySchema)
	assertCanSetVerified(user, body.updates?.verified)

	const supabase = useServerSupabase()

	// 1. Update the champs if provided
	let updatedNews = null
	if (body.updates && Object.keys(body.updates).length > 0) {
		const { data, error } = await supabase
			.from('news')
			.update(body.updates as TablesUpdate<'news'>)
			.eq('id', newsId)
			.select()
			.single()

		if (error) throw handleSupabaseError(error, 'news.update')
		updatedNews = data
	}

	// 2. Remplacer the artists if provided
	if (body.artistIds !== undefined) {
		const { error: deleteError } = await supabase
			.from('news_artists_junction')
			.delete()
			.eq('news_id', newsId)

		if (deleteError) throw handleSupabaseError(deleteError, 'news.update.artists.delete')

		if (body.artistIds.length > 0) {
			const { error: insertError } = await supabase.from('news_artists_junction').insert(
				body.artistIds.map((artistId) => ({
					news_id: newsId,
					artist_id: artistId,
				})),
			)

			if (insertError)
				throw handleSupabaseError(insertError, 'news.update.artists.insert')
		}
	}

	return updatedNews ?? { id: newsId }
})
