import type { Tables } from '~/server/types/api'

export default defineEventHandler(async () => {
	const supabase = useServerSupabase()

	try {
		// Récupérer les données en parallèle
		// Séparé en 2 groupes : totaux (avec count) et éléments récents
		const [
			// Totaux pour statistiques (avec count exact)
			totalArtistsResult,
			totalReleasesResult,
			totalNewsResult,
			activeArtistsResult,
			companiesResult,
			// Éléments récents pour affichage
			recentArtistsResult,
			recentReleasesResult,
			recentNewsResult,
		] = await Promise.all([
			// === TOTAUX (avec count) ===
			// Total artistes
			supabase.from('artists').select('*', { count: 'exact', head: true }),

			// Total releases
			supabase.from('releases').select('*', { count: 'exact', head: true }),

			// Total news
			supabase.from('news').select('*', { count: 'exact', head: true }),

			// Artistes actifs
			supabase
				.from('artists')
				.select('id', { count: 'exact', head: true })
				.eq('active_career', true),

			// Toutes les companies (pour count + verified)
			supabase.from('companies').select('id, verified'),

			// === ÉLÉMENTS RÉCENTS (avec limit) ===
			// Artistes récents (5 derniers)
			supabase
				.from('artists')
				.select('*')
				.order('created_at', { ascending: false })
				.limit(5),

			// Releases récentes avec artistes (5 dernières)
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

			// News récentes avec artistes (5 dernières)
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

		// Vérifier les erreurs
		if (totalArtistsResult.error) throw totalArtistsResult.error
		if (totalReleasesResult.error) throw totalReleasesResult.error
		if (totalNewsResult.error) throw totalNewsResult.error
		if (activeArtistsResult.error) throw activeArtistsResult.error
		if (companiesResult.error) throw companiesResult.error
		if (recentArtistsResult.error) throw recentArtistsResult.error
		if (recentReleasesResult.error) throw recentReleasesResult.error
		if (recentNewsResult.error) throw recentNewsResult.error

		// Calculer les releases récentes (30 derniers jours)
		const thirtyDaysAgo = new Date()
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
		const recentReleasesCount = (recentReleasesResult.data || []).filter((r) => {
			return new Date(r.created_at || '') > thirtyDaysAgo
		}).length

		// Calculer les statistiques avec les vrais totaux
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

		// Transformer les releases pour extraire les artistes
		const transformedReleases = (recentReleasesResult.data || []).map((release) => ({
			...release,
			artists: transformJunction<Tables<'artists'>>(release.artists, 'artist'),
		}))

		// Transformer les news pour extraire les artistes
		const transformedNews = (recentNewsResult.data || []).map((news) => ({
			...news,
			artists: transformJunction<Tables<'artists'>>(news.artists, 'artist'),
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
