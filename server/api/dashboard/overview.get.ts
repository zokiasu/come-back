export default defineEventHandler(async () => {
	const supabase = useServerSupabase()

	try {
		// Fetch data in parallel
		// Split into 2 groups: totals (with counts) and recent items
		const [
			// Totaux for statistiques (with count exact)
			totalArtistsResult,
			totalReleasesResult,
			totalNewsResult,
			activeArtistsResult,
			companiesResult,
			// Recent items for display
			recentArtistsResult,
			recentReleasesResult,
			recentNewsResult,
		] = await Promise.all([
			// Total artists
			supabase.from('artists').select('*', { count: 'exact', head: true }),

			// Total releases
			supabase.from('releases').select('*', { count: 'exact', head: true }),

			// Total news
			supabase.from('news').select('*', { count: 'exact', head: true }),

			// artists actifs
			supabase
				.from('artists')
				.select('id', { count: 'exact', head: true })
				.eq('active_career', true),

			// All companies (for count + verified)
			supabase.from('companies').select('id, verified'),

			// Recent artists (last 5)
			supabase
				.from('artists')
				.select('*')
				.order('created_at', { ascending: false })
				.limit(5),

			// Recent releases with artists (last 5)
			supabase
				.from('releases')
				.select(
					`
					*,
					artists:artist_releases(
						artist:artists(*)
					)
				`,
				)
				.order('created_at', { ascending: false })
				.limit(5),

			// Recent news with artists (last 5)
			supabase
				.from('news')
				.select(
					`
					*,
					artists:news_artists_junction(
						artist:artists(*)
					)
				`,
				)
				.order('created_at', { ascending: false })
				.limit(5),
		])

		// Check for errors
		if (totalArtistsResult.error) throw totalArtistsResult.error
		if (totalReleasesResult.error) throw totalReleasesResult.error
		if (totalNewsResult.error) throw totalNewsResult.error
		if (activeArtistsResult.error) throw activeArtistsResult.error
		if (companiesResult.error) throw companiesResult.error
		if (recentArtistsResult.error) throw recentArtistsResult.error
		if (recentReleasesResult.error) throw recentReleasesResult.error
		if (recentNewsResult.error) throw recentNewsResult.error

		// Calculate recent releases (last 30 days)
		const thirtyDaysAgo = new Date()
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
		const recentReleasesCount = (recentReleasesResult.data || []).filter((r) => {
			return new Date(r.created_at || '') > thirtyDaysAgo
		}).length

		// Calculate statistics with real totals
		const companies = companiesResult.data || []
		const stats = {
			totalArtists: totalArtistsResult.count || 0,
			activeArtists: activeArtistsResult.count || 0,
			totalReleases: totalReleasesResult.count || 0,
			recentReleases: recentReleasesCount,
			totalNews: totalNewsResult.count || 0,
			totalCompanies: companies.length,
			verifiedCompanies: companies.filter((c) => c.verified).length,
		}

		// Transform releases to extract artists
		const transformedReleases = (recentReleasesResult.data || []).map((release) => ({
			...release,
			artists: transformJunction(release.artists, 'artist'),
		}))

		// Transform news to extract artists
		const transformedNews = (recentNewsResult.data || []).map((news) => ({
			...news,
			artists: transformJunction(news.artists, 'artist'),
		}))

		return {
			stats,
			recentArtists: recentArtistsResult.data || [],
			recentReleases: transformedReleases,
			recentNews: transformedNews,
		}
	} catch (error) {
		console.error('Error fetching dashboard overview:', error)

		// Check if it's a Supabase error
		if (isPostgrestError(error)) {
			throw handleSupabaseError(error, 'dashboard.overview')
		}

		// Otherwise, it's an unexpected error
		throw createInternalError('Failed to fetch dashboard overview', error)
	}
})
