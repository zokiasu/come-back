import type { Tables } from '~/server/types/api'

export default defineEventHandler(async () => {
	const supabase = useServerSupabase()

	try {
		// Récupérer les données en parallèle
		const [
			artistsResult,
			releasesResult,
			newsResult,
			companiesResult,
			activeArtistsResult,
		] = await Promise.all([
			// Artistes récents
			supabase
				.from('artists')
				.select('*')
				.order('created_at', { ascending: false })
				.limit(5),

			// Releases récentes avec artistes
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

			// News récentes avec artistes
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

			// Statistiques des compagnies
			supabase.from('companies').select('id, verified'),

			// Artistes actifs
			supabase.from('artists').select('id').eq('active_career', true),
		])

		// Vérifier les erreurs
		if (artistsResult.error) throw artistsResult.error
		if (releasesResult.error) throw releasesResult.error
		if (newsResult.error) throw newsResult.error
		if (companiesResult.error) throw companiesResult.error
		if (activeArtistsResult.error) throw activeArtistsResult.error

		// Calculer les releases récentes (30 derniers jours)
		const thirtyDaysAgo = new Date()
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
		const recentReleasesCount = (releasesResult.data || []).filter((r) => {
			return new Date(r.created_at || '') > thirtyDaysAgo
		}).length

		// Calculer les statistiques
		const companies = companiesResult.data || []
		const stats = {
			totalArtists: artistsResult.count || artistsResult.data?.length || 0,
			activeArtists: activeArtistsResult.count || activeArtistsResult.data?.length || 0,
			totalReleases: releasesResult.count || releasesResult.data?.length || 0,
			recentReleases: recentReleasesCount,
			totalNews: newsResult.count || newsResult.data?.length || 0,
			totalCompanies: companies.length,
			verifiedCompanies: companies.filter((c) => c.verified).length,
		}

		// Transformer les releases pour extraire les artistes
		const transformedReleases = (releasesResult.data || []).map((release) => ({
			...release,
			artists: transformJunction<Tables<'artists'>>(release.artists, 'artist'),
		}))

		// Transformer les news pour extraire les artistes
		const transformedNews = (newsResult.data || []).map((news) => ({
			...news,
			artists: transformJunction<Tables<'artists'>>(news.artists, 'artist'),
		}))

		return {
			stats,
			recentArtists: artistsResult.data || [],
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
