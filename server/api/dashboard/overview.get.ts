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

			// Releases récentes
			supabase
				.from('releases')
				.select('*')
				.order('created_at', { ascending: false })
				.limit(5),

			// News récentes
			supabase
				.from('news')
				.select('*')
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

		return {
			stats,
			recentArtists: artistsResult.data || [],
			recentReleases: releasesResult.data || [],
			recentNews: newsResult.data || [],
		}
	} catch (error) {
		console.error('Error fetching dashboard overview:', error)
		throw handleSupabaseError(error as any, 'dashboard.overview')
	}
})
