/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DashboardStats, StatsFilters } from '~/types/stats'
import type { Database } from '~/types/supabase'

type SupabaseResponse<T> = {
	data: T | null
	error: any
}

type ArtistStatsRow = Pick<
	Database['public']['Tables']['artists']['Row'],
	| 'id'
	| 'name'
	| 'styles'
	| 'verified'
	| 'image'
	| 'description'
	| 'birth_date'
	| 'debut_date'
	| 'general_tags'
	| 'type'
	| 'gender'
	| 'active_career'
>

type ArtistTemporalRow = Pick<
	Database['public']['Tables']['artists']['Row'],
	'created_at' | 'debut_date' | 'birth_date'
>

type ArtistReferenceRow = Pick<
	Database['public']['Tables']['artists']['Row'],
	'id' | 'name' | 'verified'
>

type ReleaseYearRow = Pick<
	Database['public']['Tables']['releases']['Row'],
	'year' | 'type'
>

type ReleaseTypeRow = Pick<Database['public']['Tables']['releases']['Row'], 'type'>

type ReleaseScopedRow = Pick<
	Database['public']['Tables']['releases']['Row'],
	'id' | 'date' | 'year' | 'type'
> & {
	artists: Array<{ artist: ArtistReferenceRow | null }> | null
}

type MusicYearRow = Pick<Database['public']['Tables']['musics']['Row'], 'release_year'>

type MusicStatsRow = Pick<
	Database['public']['Tables']['musics']['Row'],
	'duration' | 'ismv' | 'id_youtube_music'
>

type MusicScopedRow = Pick<
	Database['public']['Tables']['musics']['Row'],
	'id' | 'date' | 'release_year' | 'duration' | 'ismv' | 'id_youtube_music'
> & {
	artists: Array<{ artist: ArtistReferenceRow | null }> | null
}

type MusicReleaseRow = Pick<
	Database['public']['Tables']['music_releases']['Row'],
	'release_id'
>

type CompanyRow = Pick<Database['public']['Tables']['companies']['Row'], 'id' | 'name'>

type CompanyRelationRow = Pick<
	Database['public']['Tables']['artist_companies']['Row'],
	'artist_id' | 'company_id' | 'relationship_type'
> & {
	companies: CompanyRow | null
}

export function useSupabaseStatistics() {
	const supabase = useSupabaseClient()
	const toast = useToast()

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

	const buildDateFilter = (filters: StatsFilters) => {
		const now = new Date()
		let startDate: Date | null = null
		let endDate: Date | null = null

		switch (filters.period) {
			case 'week':
				startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
				endDate = now
				break
			case 'month':
				if (filters.year && filters.month !== null && filters.month !== undefined) {
					startDate = new Date(filters.year, filters.month, 1)
					endDate = new Date(filters.year, filters.month + 1, 0)
				} else if (filters.year) {
					startDate = new Date(filters.year, 0, 1)
					endDate = new Date(filters.year, 11, 31)
				} else {
					startDate = new Date(now.getFullYear(), now.getMonth(), 1)
					endDate = now
				}
				break
			case 'year':
				if (filters.year) {
					startDate = new Date(filters.year, 0, 1)
					endDate = new Date(filters.year, 11, 31)
				} else {
					startDate = new Date(now.getFullYear(), 0, 1)
					endDate = now
				}
				break
		}

		if (filters.year && filters.period === 'all') {
			startDate = new Date(filters.year, 0, 1)
			endDate = new Date(filters.year, 11, 31)
		}

		return { startDate, endDate }
	}

	const normalizeDate = (date: Date) =>
		new Date(date.getFullYear(), date.getMonth(), date.getDate())

	const createTemporalMatcher = (filters: StatsFilters) => {
		const { startDate, endDate } = buildDateFilter(filters)
		const normalizedStartDate = startDate ? normalizeDate(startDate) : null
		const normalizedEndDate = endDate ? normalizeDate(endDate) : null
		const currentYear = new Date().getFullYear()

		return (dateValue?: string | null, yearValue?: number | null) => {
			if (dateValue) {
				const itemDate = normalizeDate(new Date(dateValue))

				if (normalizedStartDate && itemDate < normalizedStartDate) return false
				if (normalizedEndDate && itemDate > normalizedEndDate) return false

				return true
			}

			if (yearValue === null || yearValue === undefined) {
				return !normalizedStartDate && !normalizedEndDate
			}

			if (filters.period === 'all') {
				return filters.year ? yearValue === filters.year : true
			}

			if (filters.period === 'year') {
				return yearValue === (filters.year || currentYear)
			}

			return false
		}
	}

	const buildTemporalChartData = <
		T extends {
			date: string | null
		},
	>(
		rows: T[],
		isDaily: boolean,
	) => {
		const counts = new Map<string, number>()
		const sortedRows = [...rows].sort((a, b) => {
			if (!a.date) return 1
			if (!b.date) return -1
			return new Date(a.date).getTime() - new Date(b.date).getTime()
		})

		sortedRows.forEach((row) => {
			if (!row.date) return

			const date = new Date(row.date)
			const label = isDaily
				? date.toLocaleDateString('sv-SE')
				: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

			counts.set(label, (counts.get(label) || 0) + 1)
		})

		return {
			labels: Array.from(counts.keys()),
			data: Array.from(counts.values()),
		}
	}

	const buildArtistRanking = <
		T extends {
			artists: Array<{ artist: ArtistReferenceRow | null }> | null
		},
	>(
		rows: T[],
	) => {
		const ranking = new Map<string, { name: string; count: number }>()

		rows.forEach((row) => {
			const uniqueArtists = new Map<string, string>()

			row.artists?.forEach((item) => {
				if (!item.artist?.id || !item.artist?.name) return
				uniqueArtists.set(item.artist.id, item.artist.name)
			})

			uniqueArtists.forEach((name, id) => {
				const current = ranking.get(id)

				if (current) {
					current.count++
					return
				}

				ranking.set(id, { name, count: 1 })
			})
		})

		return Array.from(ranking.values())
			.sort((a, b) => b.count - a.count)
			.slice(0, 10)
	}

	const getArtistGeneralStats = async (filters: StatsFilters) => {
		const matchesTemporalFilters = createTemporalMatcher(filters)

		try {
			const typeStats: Array<{ type: string; count: number }> = []
			const genderStats: Array<{ gender: string; count: number }> = []
			const statusStats: Array<{ status: string; count: number }> = []

			const [artistsData, releasesData, musicsData] = await Promise.all([
				supabase
					.from('artists')
					.select(
						'id, name, styles, verified, image, description, birth_date, debut_date, general_tags, type, gender, active_career',
					)
					.eq('verified', true) as unknown as Promise<SupabaseResponse<ArtistStatsRow[]>>,
				supabase
					.from('releases')
					.select(
						`
							id,
							date,
							year,
							type,
							artists:artist_releases!inner(
								artist:artists!inner(id, name, verified)
							)
						`,
					)
					.eq('artists.artist.verified', true) as unknown as Promise<
					SupabaseResponse<ReleaseScopedRow[]>
				>,
				supabase
					.from('musics')
					.select(
						`
							id,
							date,
							release_year,
							duration,
							ismv,
							id_youtube_music,
							artists:music_artists!inner(
								artist:artists!inner(id, name, verified)
							)
						`,
					)
					.eq('artists.artist.verified', true) as unknown as Promise<
					SupabaseResponse<MusicScopedRow[]>
				>,
			])

			const artists = artistsData?.data || []
			const filteredReleases =
				releasesData?.data?.filter((release) =>
					matchesTemporalFilters(release.date, release.year),
				) || []
			const filteredMusics =
				musicsData?.data?.filter((music) =>
					matchesTemporalFilters(music.date, music.release_year),
				) || []

			const typeCounts = new Map<string, number>()
			const genderCounts = new Map<string, number>()
			const statusCounts = new Map<string, number>()
			const soloGenderStats: Record<string, number> = {}
			const groupGenderStats: Record<string, number> = {}

			artists.forEach((artist) => {
				const gender = artist.gender || 'UNKNOWN'
				const type = artist.type || 'UNKNOWN'
				const status = artist.active_career ? 'ACTIVE' : 'INACTIVE'

				typeCounts.set(type, (typeCounts.get(type) || 0) + 1)
				genderCounts.set(gender, (genderCounts.get(gender) || 0) + 1)
				statusCounts.set(status, (statusCounts.get(status) || 0) + 1)

				if (type === 'SOLO') {
					soloGenderStats[gender] = (soloGenderStats[gender] || 0) + 1
				} else if (type === 'GROUP') {
					groupGenderStats[gender] = (groupGenderStats[gender] || 0) + 1
				}
			})

			typeCounts.forEach((count, type) => {
				typeStats.push({ type, count })
			})

			genderCounts.forEach((count, gender) => {
				genderStats.push({ gender, count })
			})

			statusCounts.forEach((count, status) => {
				statusStats.push({ status, count })
			})

			const genreStats: Record<string, number> = {}
			const totalArtists = artists.length

			artists.forEach((artist) => {
				if (artist.styles && artist.styles.length > 0) {
					artist.styles.forEach((style) => {
						genreStats[style] = (genreStats[style] || 0) + 1
					})
				} else {
					genreStats.Undefined = (genreStats.Undefined || 0) + 1
				}
			})

			let verifiedCount = 0
			let withImageCount = 0
			let completeProfilesCount = 0

			artists.forEach((artist) => {
				if (artist.verified) verifiedCount++
				if (artist.image) withImageCount++

				const filledFields = [
					artist.description,
					artist.birth_date,
					artist.debut_date,
					artist.image,
					artist.styles?.length && artist.styles.length > 0,
					artist.general_tags?.length && artist.general_tags.length > 0,
					artist.verified,
				].filter(Boolean).length

				if (filledFields >= 5) completeProfilesCount++
			})

			return {
				typeStats,
				genderStats,
				soloGenderStats: Object.entries(soloGenderStats).map(([gender, count]) => ({
					gender,
					count,
				})),
				groupGenderStats: Object.entries(groupGenderStats).map(([gender, count]) => ({
					gender,
					count,
				})),
				statusStats,
				genreStats: Object.entries(genreStats)
					.sort((a, b) => b[1] - a[1])
					.slice(0, 10)
					.map(([genre, count]) => ({ genre, count })),
				qualityStats: {
					verificationRate:
						totalArtists > 0 ? Math.round((verifiedCount / totalArtists) * 100) : 0,
					imageRate:
						totalArtists > 0 ? Math.round((withImageCount / totalArtists) * 100) : 0,
					completionRate:
						totalArtists > 0
							? Math.round((completeProfilesCount / totalArtists) * 100)
							: 0,
					totalArtists,
					verifiedArtists: verifiedCount,
					artistsWithImages: withImageCount,
					completeProfiles: completeProfilesCount,
				},
				topReleases: buildArtistRanking(filteredReleases),
				topMusics: buildArtistRanking(filteredMusics),
			}
		} catch (error) {
			console.error('Error in getArtistGeneralStats:', error)
			return {
				typeStats: [],
				genderStats: [],
				soloGenderStats: [],
				groupGenderStats: [],
				statusStats: [],
				genreStats: [],
				qualityStats: {
					verificationRate: 0,
					imageRate: 0,
					completionRate: 0,
					totalArtists: 0,
					verifiedArtists: 0,
					artistsWithImages: 0,
					completeProfiles: 0,
				},
				topReleases: [],
				topMusics: [],
			}
		}
	}

	const getArtistTemporalStats = async () => {
		const { data: artistsData } = await supabase
			.from('artists')
			.select('created_at, debut_date, birth_date')

		const creationEvolution: Record<number, number> = {}
		const debutYears: Record<number, number> = {}
		const birthPeriods: Record<string, number> = {}

		artistsData?.forEach((artist: ArtistTemporalRow) => {
			if (artist.created_at) {
				const year = new Date(artist.created_at).getFullYear()
				creationEvolution[year] = (creationEvolution[year] || 0) + 1
			}

			if (artist.debut_date) {
				const year = new Date(artist.debut_date).getFullYear()
				debutYears[year] = (debutYears[year] || 0) + 1
			}

			if (artist.birth_date) {
				const year = new Date(artist.birth_date).getFullYear()
				const decade = Math.floor(year / 10) * 10
				const period = `${decade}s`
				birthPeriods[period] = (birthPeriods[period] || 0) + 1
			}
		})

		return {
			creationEvolution: Object.entries(creationEvolution)
				.sort(([a], [b]) => Number(a) - Number(b))
				.map(([year, count]) => ({ year: Number(year), count })),
			debutYears: Object.entries(debutYears)
				.sort(([a], [b]) => Number(a) - Number(b))
				.map(([year, count]) => ({ year: Number(year), count })),
			birthPeriods: Object.entries(birthPeriods)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([period, count]) => ({ period, count })),
		}
	}

	const getYearlyStats = async () => {
		const { data: releasesData } = await supabase
			.from('releases')
			.select('year, type')
			.not('year', 'is', null)

		const { data: musicsData } = await supabase
			.from('musics')
			.select('release_year')
			.not('release_year', 'is', null)

		const releasesByYear: Record<number, number> = {}
		const releaseTypesByYear: Record<
			number,
			{ ALBUM: number; SINGLE: number; EP: number; COMPILATION: number }
		> = {}
		const musicsByYear: Record<number, number> = {}

		releasesData?.forEach((release: ReleaseYearRow) => {
			const year = release.year!
			releasesByYear[year] = (releasesByYear[year] || 0) + 1

			if (!releaseTypesByYear[year]) {
				releaseTypesByYear[year] = { ALBUM: 0, SINGLE: 0, EP: 0, COMPILATION: 0 }
			}
			const yearData = releaseTypesByYear[year]
			const releaseType = (release.type || 'SINGLE') as keyof typeof yearData
			yearData[releaseType]++
		})

		musicsData?.forEach((music: MusicYearRow) => {
			const year = music.release_year!
			musicsByYear[year] = (musicsByYear[year] || 0) + 1
		})

		return {
			releasesByYear: Object.entries(releasesByYear)
				.sort(([a], [b]) => Number(a) - Number(b))
				.map(([year, count]) => ({ year: Number(year), count })),
			musicsByYear: Object.entries(musicsByYear)
				.sort(([a], [b]) => Number(a) - Number(b))
				.map(([year, count]) => ({ year: Number(year), count })),
			releaseTypesByYear: Object.entries(releaseTypesByYear)
				.sort(([a], [b]) => Number(a) - Number(b))
				.map(([year, types]) => ({ year: Number(year), ...types })),
		}
	}

	const getCompanyStats = async () => {
		const { data: companyArtistsData } = (await supabase
			.from('artist_companies')
			.select('company_id, relationship_type, companies(name)')) as {
			data: Array<{
				company_id: string
				relationship_type: string | null
				companies: { name: string } | null
			}> | null
		}

		const companyArtistCount: Record<string, { name: string; count: number }> = {}
		const relationshipTypes: Record<string, number> = {}

		companyArtistsData?.forEach((relation) => {
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

		return {
			topCompanies: Object.values(companyArtistCount)
				.sort((a, b) => b.count - a.count)
				.slice(0, 10),
			relationshipTypes: Object.entries(relationshipTypes).map(([type, count]) => ({
				type,
				count,
			})),
		}
	}

	const getMusicAdvancedStats = async () => {
		const { data: releasesData } = await supabase.from('releases').select('type')

		const { data: musicDurationData } = (await supabase
			.from('music_releases')
			.select('release_id, musics(duration), releases(type)')) as {
			data: Array<{
				release_id: string
				musics: { duration: number } | null
				releases: { type: string } | null
			}> | null
		}

		const { data: trackCountData } = await supabase
			.from('music_releases')
			.select('release_id')

		const { data: musicsData } = await supabase
			.from('musics')
			.select('duration, ismv, id_youtube_music')

		const releaseTypes: Record<string, number> = {}
		releasesData?.forEach((release: ReleaseTypeRow) => {
			const type = release.type || 'UNKNOWN'
			releaseTypes[type] = (releaseTypes[type] || 0) + 1
		})

		const durationByType: Record<string, { total: number; count: number }> = {}
		musicDurationData?.forEach((item) => {
			const type = item.releases?.type || 'UNKNOWN'
			const duration = item.musics?.duration

			if (duration) {
				if (!durationByType[type]) {
					durationByType[type] = { total: 0, count: 0 }
				}
				const typeData = durationByType[type]
				typeData.total += duration
				typeData.count++
			}
		})

		const tracksPerRelease: Record<string, number> = {}
		trackCountData?.forEach((item: MusicReleaseRow) => {
			tracksPerRelease[item.release_id] = (tracksPerRelease[item.release_id] || 0) + 1
		})

		let totalDuration = 0
		let durationCount = 0
		let mvCount = 0
		let youtubeMusicCount = 0
		const totalMusics = musicsData?.length || 0

		musicsData?.forEach((music: MusicStatsRow) => {
			if (music.duration) {
				totalDuration += music.duration
				durationCount++
			}
			if (music.ismv) mvCount++
			if (music.id_youtube_music) youtubeMusicCount++
		})

		return {
			releaseTypes: Object.entries(releaseTypes).map(([type, count]) => ({
				type,
				count,
			})),
			averageDurationByType: Object.entries(durationByType).map(([type, data]) => ({
				type,
				averageDuration: Math.round(data.total / data.count),
			})),
			averageTracksPerRelease:
				Object.values(tracksPerRelease).reduce((sum, count) => sum + count, 0) /
				Object.keys(tracksPerRelease).length,
			averageSongDuration:
				durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
			mvPercentage: Math.round((mvCount / totalMusics) * 100),
			youtubeMusicPercentage: Math.round((youtubeMusicCount / totalMusics) * 100),
		}
	}

	const getStatistics = async (filters: StatsFilters): Promise<DashboardStats> => {
		try {
			const isMonthlyView =
				filters.period === 'month' &&
				filters.month !== null &&
				filters.month !== undefined &&
				filters.year !== null &&
				filters.year !== undefined
			const matchesTemporalFilters = createTemporalMatcher(filters)

			const [artistGeneral, companyRelationsData, releasesData, musicsData] =
				await Promise.all([
					getArtistGeneralStats(filters),
					supabase
						.from('artist_companies')
						.select(
							`
								artist_id,
								company_id,
								relationship_type,
								companies(id, name),
								artists!inner(id, verified)
							`,
						)
						.eq('artists.verified', true) as unknown as Promise<
						SupabaseResponse<CompanyRelationRow[]>
					>,
					supabase
						.from('releases')
						.select(
							`
								id,
								date,
								year,
								type,
								artists:artist_releases!inner(
									artist:artists!inner(id, name, verified)
								)
							`,
						)
						.eq('artists.artist.verified', true) as unknown as Promise<
						SupabaseResponse<ReleaseScopedRow[]>
					>,
					supabase
						.from('musics')
						.select(
							`
								id,
								date,
								release_year,
								duration,
								ismv,
								id_youtube_music,
								artists:music_artists!inner(
									artist:artists!inner(id, name, verified)
								)
							`,
						)
						.eq('artists.artist.verified', true) as unknown as Promise<
						SupabaseResponse<MusicScopedRow[]>
					>,
				])

			const filteredReleases =
				releasesData?.data?.filter((release) =>
					matchesTemporalFilters(release.date, release.year),
				) || []
			const filteredMusics =
				musicsData?.data?.filter((music) =>
					matchesTemporalFilters(music.date, music.release_year),
				) || []

			const companyRelations = companyRelationsData?.data || []
			const companiesById = new Map<
				string,
				{
					company_id: string
					company_name: string
					artistIds: Set<string>
					releaseIds: Set<string>
				}
			>()
			const artistCompaniesMap = new Map<string, Set<string>>()

			companyRelations.forEach((relation) => {
				if (!relation.company_id) return

				if (!companiesById.has(relation.company_id)) {
					companiesById.set(relation.company_id, {
						company_id: relation.company_id,
						company_name: relation.companies?.name || 'Unknown',
						artistIds: new Set<string>(),
						releaseIds: new Set<string>(),
					})
				}

				companiesById.get(relation.company_id)?.artistIds.add(relation.artist_id)

				const companyIds = artistCompaniesMap.get(relation.artist_id) || new Set<string>()
				companyIds.add(relation.company_id)
				artistCompaniesMap.set(relation.artist_id, companyIds)
			})

			filteredReleases.forEach((release) => {
				const releaseArtistIds = new Set<string>()

				release.artists?.forEach((item) => {
					if (item.artist?.id) {
						releaseArtistIds.add(item.artist.id)
					}
				})

				releaseArtistIds.forEach((artistId) => {
					artistCompaniesMap.get(artistId)?.forEach((companyId) => {
						companiesById.get(companyId)?.releaseIds.add(release.id)
					})
				})
			})

			const companyStatsData = Array.from(companiesById.values())
				.map((company) => ({
					company_id: company.company_id,
					company_name: company.company_name,
					artist_count: company.artistIds.size,
					release_count: company.releaseIds.size,
				}))
				.sort((a, b) => b.artist_count - a.artist_count)

			const releasesTemporalChart = buildTemporalChartData(
				filteredReleases,
				isMonthlyView,
			)
			const musicsTemporalChart = buildTemporalChartData(filteredMusics, isMonthlyView)
			const totalVerifiedArtists = artistGeneral.qualityStats.totalArtists

			return {
				general: {
					title: 'Overview',
					cards: [
						{
							title: 'Total Artists',
							value: totalVerifiedArtists,
							icon: 'i-heroicons-user-group',
							color: 'blue',
						},
						{
							title: 'Total Releases',
							value: filteredReleases.length,
							icon: 'i-heroicons-musical-note',
							color: 'green',
						},
						{
							title: 'Total Tracks',
							value: filteredMusics.length,
							icon: 'i-heroicons-play',
							color: 'purple',
						},
						{
							title: 'Total Companies',
							value: companiesById.size,
							icon: 'i-heroicons-building-office',
							color: 'orange',
						},
					],
				},
				artists: {
					title: 'Artist Statistics',
					cards: [
						{
							title: 'Solo Artists',
							value: artistGeneral.typeStats.find((s) => s.type === 'SOLO')?.count || 0,
							icon: 'i-heroicons-user',
							color: 'blue',
						},
						{
							title: 'Groups',
							value: artistGeneral.typeStats.find((s) => s.type === 'GROUP')?.count || 0,
							icon: 'i-heroicons-user-group',
							color: 'green',
						},
						{
							title: 'Verified Profiles',
							value: `${artistGeneral.qualityStats.verificationRate}%`,
							icon: 'i-heroicons-check-badge',
							color: 'green',
						},
						{
							title: 'Completed Profiles',
							value: `${artistGeneral.qualityStats.completionRate}%`,
							icon: 'i-heroicons-clipboard-document-check',
							color: 'blue',
						},
					],
					charts: [
						{
							title: 'Music Genre Distribution',
							data: {
								labels: artistGeneral.genreStats.map((s) => s.genre),
								data: artistGeneral.genreStats.map((s) => s.count),
								type: 'bar',
							},
							description: 'Top 10 most represented music genres',
						},
						{
							title: 'Gender Distribution (Overall)',
							data: {
								labels: artistGeneral.genderStats.map((s) => s.gender),
								data: artistGeneral.genderStats.map((s) => s.count),
								colors: getGenderColors(artistGeneral.genderStats),
								type: 'doughnut',
							},
							description: 'Gender distribution for all verified artists',
						},
						{
							title: 'Gender Distribution (Solo Artists)',
							data: {
								labels: artistGeneral.soloGenderStats.map((s) => s.gender),
								data: artistGeneral.soloGenderStats.map((s) => s.count),
								colors: getGenderColors(artistGeneral.soloGenderStats),
								type: 'doughnut',
							},
							description: 'Gender distribution for verified solo artists',
						},
						{
							title: 'Gender Distribution (Groups)',
							data: {
								labels: artistGeneral.groupGenderStats.map((s) => s.gender),
								data: artistGeneral.groupGenderStats.map((s) => s.count),
								colors: getGenderColors(artistGeneral.groupGenderStats),
								type: 'doughnut',
							},
							description: 'Gender distribution for verified groups',
						},
						{
							title: 'Profile Quality',
							data: {
								labels: ['Verified', 'With Image', 'Completed Profiles'],
								data: [
									artistGeneral.qualityStats.verificationRate,
									artistGeneral.qualityStats.imageRate,
									artistGeneral.qualityStats.completionRate,
								],
								type: 'bar',
							},
							description: 'Profile quality among verified artists',
						},
					],
					topLists: [
						{
							title: 'Top Artists - Releases',
							items: artistGeneral.topReleases.map(
								(artist: { name: string; count: number }, index: number) => ({
									id: `release-${index}`,
									name: artist.name,
									value: artist.count,
									subtitle: `${artist.count} releases`,
								}),
							),
						},
						{
							title: 'Top Artists - Tracks',
							items: artistGeneral.topMusics.map(
								(artist: { name: string; count: number }, index: number) => ({
									id: `music-${index}`,
									name: artist.name,
									value: artist.count,
									subtitle: `${artist.count} tracks`,
								}),
							),
						},
					],
				},
				companies: {
					title: 'Company Statistics',
					cards: [
						{
							title: 'Total Companies',
							value: companiesById.size,
							icon: 'i-heroicons-building-office',
							color: 'orange',
						},
					],
					topLists: [
						{
							title: 'Top Companies',
							items: companyStatsData.slice(0, 10).map((comp, index) => ({
								id: comp.company_id || index.toString(),
								name: comp.company_name || 'Unknown',
								value: comp.artist_count || 0,
								subtitle: `${comp.artist_count || 0} artists, ${comp.release_count || 0} releases`,
							})),
						},
					],
				},
				music: {
					title: 'Music Statistics',
					cards: [
						{
							title: 'Total Tracks',
							value: filteredMusics.length,
							icon: 'i-heroicons-play',
							color: 'purple',
						},
						{
							title: 'Total Releases',
							value: filteredReleases.length,
							icon: 'i-heroicons-musical-note',
							color: 'green',
						},
					],
					charts: [
						{
							title: `Release Evolution ${isMonthlyView ? 'by day' : 'by month'}`,
							data: {
								labels: releasesTemporalChart.labels,
								data: releasesTemporalChart.data,
								type: 'line',
							},
							description: isMonthlyView
								? 'Number of releases linked to verified artists, by day'
								: 'Number of releases linked to verified artists, by month',
						},
						{
							title: `Track Evolution ${isMonthlyView ? 'by day' : 'by month'}`,
							data: {
								labels: musicsTemporalChart.labels,
								data: musicsTemporalChart.data,
								type: 'line',
							},
							description: isMonthlyView
								? 'Number of tracks linked to verified artists, by day'
								: 'Number of tracks linked to verified artists, by month',
						},
					],
				},
			}
		} catch (error) {
			console.error('Error while loading statistics:', error)
			toast.add({
				title: 'Error',
				description: 'Unable to load statistics',
				color: 'error',
			})
			throw error
		}
	}

	return {
		getStatistics,
		getArtistGeneralStats,
		getArtistTemporalStats,
		getYearlyStats,
		getCompanyStats,
		getMusicAdvancedStats,
	}
}
