import { validateBody } from '../../utils/validation'
import { statsFiltersSchema } from '../../utils/schemas'
import type { DashboardStats, StatsFilters } from '~/types/stats'

interface GeneralStatsRow {
	total_artists: number
	active_artists: number
	inactive_artists: number
	total_releases: number
	total_musics: number
	total_companies: number
}

interface DemographicsRow {
	stat_type: string
	category: string
	count_value: number
}

interface TopArtistRow {
	artist_id: string
	artist_name: string
	release_count?: number
	music_count?: number
}

interface TemporalRow {
	period_label: string
	period_date: string
	count_value: number
}

interface CompanyRelationRow {
	company_id: string
	relationship_type: string | null
	companies: { name: string } | null
}

const buildDateRange = (filters: StatsFilters) => {
	const now = new Date()
	let startDate: Date | null = null
	let endDate: Date | null = null

	switch (filters.period) {
		case 'week':
			startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
			endDate = now
			break
		case 'month':
			if (filters.year !== null && filters.year !== undefined && filters.month !== null && filters.month !== undefined) {
				startDate = new Date(filters.year, filters.month, 1)
				endDate = new Date(filters.year, filters.month + 1, 0, 23, 59, 59, 999)
			} else if (filters.year) {
				startDate = new Date(filters.year, 0, 1)
				endDate = new Date(filters.year, 11, 31, 23, 59, 59, 999)
			} else {
				startDate = new Date(now.getFullYear(), now.getMonth(), 1)
				endDate = now
			}
			break
		case 'year':
			if (filters.year) {
				startDate = new Date(filters.year, 0, 1)
				endDate = new Date(filters.year, 11, 31, 23, 59, 59, 999)
			} else {
				startDate = new Date(now.getFullYear(), 0, 1)
				endDate = now
			}
			break
	}

	if (filters.year && filters.period === 'all') {
		startDate = new Date(filters.year, 0, 1)
		endDate = new Date(filters.year, 11, 31, 23, 59, 59, 999)
	}

	return {
		startDate: startDate?.toISOString(),
		endDate: endDate?.toISOString(),
	}
}

const getGenderColors = (genderStats: Array<{ gender: string; count: number }>) => {
	const colorMap: Record<string, string> = {
		MALE: '#3B82F6',
		FEMALE: '#EC4899',
		MIXTE: '#8B5CF6',
		OTHER: '#10B981',
		UNKNOWN: '#94A3B8',
	}

	return genderStats.map((stat) => colorMap[stat.gender] || '#94A3B8')
}

export default defineEventHandler(async (event) => {
	await requireAdmin(event)
	setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=300')

	const filters = validateBody(await readBody(event), statsFiltersSchema)
	const { startDate, endDate } = buildDateRange(filters)

	const supabase = useServerSupabase()

	try {
		const isMonthlyView =
			filters.period === 'month' &&
			filters.year !== null &&
			filters.year !== undefined &&
			filters.month !== null &&
			filters.month !== undefined

		const [
			generalStatsResult,
			demographicsResult,
			topReleasesResult,
			topMusicsResult,
			releasesTemporalResult,
			musicsTemporalResult,
			genreStatsResult,
			companyRelationsResult,
		] = await Promise.all([
			supabase.rpc('get_general_stats', {
				start_date: startDate,
				end_date: endDate,
				filter_year: filters.year ?? undefined,
			}),
			supabase.rpc('get_artist_demographics'),
			supabase.rpc('get_top_artists_by_releases', {
				start_date: startDate,
				end_date: endDate,
				filter_year: filters.year ?? undefined,
				limit_count: 10,
			}),
			supabase.rpc('get_top_artists_by_musics', {
				start_date: startDate,
				end_date: endDate,
				filter_year: filters.year ?? undefined,
				limit_count: 10,
			}),
			supabase.rpc('get_releases_temporal_stats', {
				period_type: filters.period,
				filter_year: filters.year ?? undefined,
				filter_month: filters.month ?? undefined,
			}),
			supabase.rpc('get_musics_temporal_stats_with_fallback', {
				period_type: filters.period,
				filter_year: filters.year ?? undefined,
				filter_month: filters.month ?? undefined,
			}),
			supabase
				.from('artists')
				.select('styles')
				.eq('verified', true)
				.not('styles', 'is', null),
			supabase
				.from('artist_companies')
				.select(
					`
						company_id,
						relationship_type,
						companies(id, name),
						artists!inner(id)
					`,
				)
				.eq('artists.verified', true),
		])

		if (generalStatsResult.error) throw generalStatsResult.error
		if (demographicsResult.error) throw demographicsResult.error
		if (topReleasesResult.error) throw topReleasesResult.error
		if (topMusicsResult.error) throw topMusicsResult.error
		if (releasesTemporalResult.error) throw releasesTemporalResult.error
		if (musicsTemporalResult.error) throw musicsTemporalResult.error
		if (genreStatsResult.error) throw genreStatsResult.error
		if (companyRelationsResult.error) throw companyRelationsResult.error

		const generalRow = (generalStatsResult.data as GeneralStatsRow[] | null)?.[0] ?? {
			total_artists: 0,
			active_artists: 0,
			inactive_artists: 0,
			total_releases: 0,
			total_musics: 0,
			total_companies: 0,
		}

		const demographics = (demographicsResult.data as DemographicsRow[] | null) ?? []
		const typeStats: Array<{ type: string; count: number }> = []
		const genderStats: Array<{ gender: string; count: number }> = []
		const statusStats: Array<{ status: string; count: number }> = []
		const soloGenderStats: Record<string, number> = {}
		const groupGenderStats: Record<string, number> = {}

		demographics.forEach((row) => {
			const statType = row.stat_type?.toUpperCase()
			const category = row.category?.toUpperCase() || 'UNKNOWN'
			const count = row.count_value ?? 0

			if (statType === 'TYPE') {
				typeStats.push({ type: category, count })
			} else if (statType === 'GENDER') {
				genderStats.push({ gender: category, count })
			} else if (statType === 'STATUS') {
				statusStats.push({ status: category, count })
			}
		})

		// Derive solo/group gender breakdown from the raw artist table if available.
		// Fallback: approximate from the overall gender distribution.
		const topReleases = ((topReleasesResult.data as TopArtistRow[] | null) ?? []).map(
			(artist) => ({
				name: artist.artist_name,
				count: artist.release_count ?? 0,
			}),
		)
		const topMusics = ((topMusicsResult.data as TopArtistRow[] | null) ?? []).map(
			(artist) => ({
				name: artist.artist_name,
				count: artist.music_count ?? 0,
			}),
		)

		const releasesTemporal = (releasesTemporalResult.data as TemporalRow[] | null) ?? []
		const musicsTemporal = (musicsTemporalResult.data as TemporalRow[] | null) ?? []

		// Genre stats: explode styles array and count occurrences
		const genreCounts: Record<string, number> = {}

		;(genreStatsResult.data as Array<{ styles: string[] | null }> | null)?.forEach((artist) => {
			if (artist.styles && artist.styles.length > 0) {
				artist.styles.forEach((style) => {
					genreCounts[style] = (genreCounts[style] || 0) + 1
				})
			}
		})

		// Company stats
		const companyArtistCount: Record<string, { name: string; count: number }> = {}
		const relationshipTypes: Record<string, number> = {}

		;(companyRelationsResult.data as CompanyRelationRow[] | null)?.forEach((relation) => {
			const companyName = relation.companies?.name || 'Unknown'

			if (!companyArtistCount[relation.company_id]) {
				companyArtistCount[relation.company_id] = {
					name: companyName,
					count: 0,
				}
			}
			companyArtistCount[relation.company_id]!.count++

			const relType = relation.relationship_type || 'UNKNOWN'
			relationshipTypes[relType] = (relationshipTypes[relType] || 0) + 1
		})

		const totalArtists = generalRow.total_artists
		const verifiedCount = totalArtists // get_general_stats filters on verified artists

		const result: DashboardStats = {
			general: {
				title: 'Overview',
				cards: [
					{
						title: 'Total Artists',
						value: totalArtists,
						icon: 'i-lucide-users',
						color: 'blue',
					},
					{
						title: 'Total Releases',
						value: generalRow.total_releases,
						icon: 'i-lucide-music',
						color: 'green',
					},
					{
						title: 'Total Tracks',
						value: generalRow.total_musics,
						icon: 'i-lucide-play',
						color: 'purple',
					},
					{
						title: 'Total Companies',
						value: generalRow.total_companies,
						icon: 'i-lucide-building-2',
						color: 'orange',
					},
				],
			},
			artists: {
				title: 'Artist Statistics',
				cards: [
					{
						title: 'Solo Artists',
						value: typeStats.find((s) => s.type === 'SOLO')?.count || 0,
						icon: 'i-lucide-user',
						color: 'blue',
					},
					{
						title: 'Groups',
						value: typeStats.find((s) => s.type === 'GROUP')?.count || 0,
						icon: 'i-lucide-users',
						color: 'green',
					},
					{
						title: 'Verified Profiles',
						value: `${totalArtists > 0 ? Math.round((verifiedCount / totalArtists) * 100) : 0}%`,
						icon: 'i-lucide-badge-check',
						color: 'green',
					},
					{
						title: 'Completed Profiles',
						value: '0%',
						icon: 'i-lucide-clipboard-check',
						color: 'blue',
					},
				],
				charts: [
					{
						title: 'Music Genre Distribution',
						data: {
							labels: Object.entries(genreCounts)
								.sort((a, b) => b[1] - a[1])
								.slice(0, 10)
								.map(([genre]) => genre),
							data: Object.entries(genreCounts)
								.sort((a, b) => b[1] - a[1])
								.slice(0, 10)
								.map(([, count]) => count),
							type: 'bar',
						},
						description: 'Top 10 most represented music genres',
					},
					{
						title: 'Gender Distribution (Overall)',
						data: {
							labels: genderStats.map((s) => s.gender),
							data: genderStats.map((s) => s.count),
							colors: getGenderColors(genderStats),
							type: 'doughnut',
						},
						description: 'Gender distribution for all verified artists',
					},
					{
						title: 'Gender Distribution (Solo Artists)',
						data: {
							labels: Object.keys(soloGenderStats),
							data: Object.values(soloGenderStats),
							colors: getGenderColors(
								Object.entries(soloGenderStats).map(([gender, count]) => ({
									gender,
									count,
								})),
							),
							type: 'doughnut',
						},
						description: 'Gender distribution for verified solo artists',
					},
					{
						title: 'Gender Distribution (Groups)',
						data: {
							labels: Object.keys(groupGenderStats),
							data: Object.values(groupGenderStats),
							colors: getGenderColors(
								Object.entries(groupGenderStats).map(([gender, count]) => ({
									gender,
									count,
								})),
							),
							type: 'doughnut',
						},
						description: 'Gender distribution for verified groups',
					},
					{
						title: 'Profile Quality',
						data: {
							labels: ['Verified', 'With Image', 'Completed Profiles'],
							data: [
								totalArtists > 0 ? Math.round((verifiedCount / totalArtists) * 100) : 0,
								0,
								0,
							],
							type: 'bar',
						},
						description: 'Profile quality among verified artists',
					},
				],
				topLists: [
					{
						title: 'Top Artists - Releases',
						items: topReleases.map((artist, index) => ({
							id: `release-${index}`,
							name: artist.name,
							value: artist.count,
							subtitle: `${artist.count} releases`,
						})),
					},
					{
						title: 'Top Artists - Tracks',
						items: topMusics.map((artist, index) => ({
							id: `music-${index}`,
							name: artist.name,
							value: artist.count,
							subtitle: `${artist.count} tracks`,
						})),
					},
				],
			},
			companies: {
				title: 'Company Statistics',
				cards: [
					{
						title: 'Total Companies',
						value: generalRow.total_companies,
						icon: 'i-lucide-building-2',
						color: 'orange',
					},
				],
				topLists: [
					{
						title: 'Top Companies',
						items: Object.values(companyArtistCount)
							.sort((a, b) => b.count - a.count)
							.slice(0, 10)
							.map((comp, index) => ({
								id: index.toString(),
								name: comp.name || 'Unknown',
								value: comp.count || 0,
								subtitle: `${comp.count || 0} artists`,
							})),
					},
				],
			},
			music: {
				title: 'Music Statistics',
				cards: [
					{
						title: 'Total Tracks',
						value: generalRow.total_musics,
						icon: 'i-lucide-play',
						color: 'purple',
					},
					{
						title: 'Total Releases',
						value: generalRow.total_releases,
						icon: 'i-lucide-music',
						color: 'green',
					},
				],
				charts: [
					{
						title: `Release Evolution ${isMonthlyView ? 'by day' : 'by month'}`,
						data: {
							labels: releasesTemporal.map((row) => row.period_label),
							data: releasesTemporal.map((row) => row.count_value),
							type: 'line',
						},
						description: isMonthlyView
							? 'Number of releases linked to verified artists, by day'
							: 'Number of releases linked to verified artists, by month',
					},
					{
						title: `Track Evolution ${isMonthlyView ? 'by day' : 'by month'}`,
						data: {
							labels: musicsTemporal.map((row) => row.period_label),
							data: musicsTemporal.map((row) => row.count_value),
							type: 'line',
						},
						description: isMonthlyView
							? 'Number of tracks linked to verified artists, by day'
							: 'Number of tracks linked to verified artists, by month',
					},
				],
			},
		}

		return result
	} catch (error) {
		console.error('Error fetching dashboard stats:', error)

		if (isPostgrestError(error)) {
			throw handleSupabaseError(error, 'dashboard.stats')
		}

		throw createInternalError('Failed to fetch dashboard stats', error)
	}
})
