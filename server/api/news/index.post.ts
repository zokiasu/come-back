import type { TablesInsert } from '~/types/supabase'

interface CreateNewsBody {
	data: TablesInsert<'news'>
	artistIds: string[]
}

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const body = await readBody<CreateNewsBody>(event)

	if (!body?.data?.message) {
		throw createBadRequestError('News message is required')
	}

	if (!body.artistIds?.length) {
		throw createBadRequestError('At least one artist is required')
	}

	const supabase = useServerSupabase()

	// 1. Créer la news
	const { data: news, error: newsError } = await supabase
		.from('news')
		.insert(body.data)
		.select()
		.single()

	if (newsError) throw handleSupabaseError(newsError, 'news.create')

	// 2. Lier les artistes
	const { error: junctionError } = await supabase.from('news_artists_junction').insert(
		body.artistIds.map((artistId) => ({
			news_id: news.id,
			artist_id: artistId,
		})),
	)

	if (junctionError) {
		// Rollback
		await supabase.from('news').delete().eq('id', news.id)
		throw handleSupabaseError(junctionError, 'news.create.artists')
	}

	return news
})
