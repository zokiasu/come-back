export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	setHeader(event, 'Cache-Control', 'private, no-store')

	const supabase = useServerSupabase()
	const [rankings, publicRankings, artistContributions, newsContributions] =
		await Promise.all([
			supabase
				.from('user_rankings')
				.select('id', { count: 'exact', head: true })
				.eq('user_id', user.id),
			supabase
				.from('user_rankings')
				.select('id', { count: 'exact', head: true })
				.eq('user_id', user.id)
				.eq('is_public', true),
			supabase
				.from('user_artist_contributions')
				.select('artist_id', { count: 'exact', head: true })
				.eq('user_id', user.id),
			supabase
				.from('user_news_contributions')
				.select('news_id', { count: 'exact', head: true })
				.eq('user_id', user.id),
		])

	const results = [rankings, publicRankings, artistContributions, newsContributions]
	const error = results.find((result) => result.error)?.error
	if (error) throw handleSupabaseError(error, 'users.activity-summary')

	return {
		totalRankings: rankings.count ?? 0,
		publicRankings: publicRankings.count ?? 0,
		artistContributions: artistContributions.count ?? 0,
		newsContributions: newsContributions.count ?? 0,
	}
})
