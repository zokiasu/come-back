import type { TablesUpdate } from '~/types/supabase'

interface UpdateNewsBody {
	updates?: TablesUpdate<'news'>
	artistIds?: string[]
}

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const newsId = validateRouteParam(event, 'id', 'News')
	const body = await readBody<UpdateNewsBody>(event)

	if (!body) {
		throw createBadRequestError('Request body is required')
	}

	const supabase = useServerSupabase()

	// 1. Mettre à jour les champs si fournis
	let updatedNews = null
	if (body.updates && Object.keys(body.updates).length > 0) {
		const { data, error } = await supabase
			.from('news')
			.update(body.updates)
			.eq('id', newsId)
			.select()
			.single()

		if (error) throw handleSupabaseError(error, 'news.update')
		updatedNews = data
	}

	// 2. Remplacer les artistes si fournis
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

			if (insertError) throw handleSupabaseError(insertError, 'news.update.artists.insert')
		}
	}

	return updatedNews ?? { id: newsId }
})
