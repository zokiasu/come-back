import type { TablesInsert } from '~/types/supabase'
import { assertCanSetVerified, validateBody } from '../../utils/validation'
import { createNewsBodySchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
	const user = await requireContributor(event)

	const body = validateBody(await readBody(event), createNewsBodySchema)
	assertCanSetVerified(user, body.data.verified)

	const supabase = useServerSupabase()

	// 1. Create the news
	const { data: news, error: newsError } = await supabase
		.from('news')
		.insert(body.data as TablesInsert<'news'>)
		.select()
		.single()

	if (newsError) throw handleSupabaseError(newsError, 'news.create')

	// 2. Link the artists
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
