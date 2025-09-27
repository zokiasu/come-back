import type { DashboardStats, StatsFilters } from '~/types/stats'
import type { Database } from '~/types'

// Types pour les réponses Supabase
type SupabaseResponse<T> = {
	data: T | null
	error: any
}

// Types pour les appels RPC basés sur le schéma Supabase
interface RPCDemographicsItem {
	stat_type: 'type' | 'gender' | 'status'
	category: string
	count_value: number
}

interface RPCTopArtist {
	artist_name: string
	release_count: number
	music_count: number
}

interface RPCGeneralStats {
	total_artists: number
	total_releases: number
	total_musics: number
	total_companies: number
	active_artists: number
	inactive_artists: number
}

interface RPCTemporalData {
	period_label: string
	count_value: number
}

// Types spécifiques pour les requêtes Supabase
type ArtistStatsRow = Pick<
	Database['public']['Tables']['artists']['Row'],
	| 'styles'
	| 'verified'
	| 'image'
	| 'description'
	| 'birth_date'
	| 'debut_date'
	| 'general_tags'
	| 'type'
	| 'gender'
>

type ArtistTemporalRow = Pick<
	Database['public']['Tables']['artists']['Row'],
	'created_at' | 'debut_date' | 'birth_date'
>

type ReleaseYearRow = Pick<
	Database['public']['Tables']['releases']['Row'],
	'year' | 'type'
>

type ReleaseTypeRow = Pick<Database['public']['Tables']['releases']['Row'], 'type'>

type MusicYearRow = Pick<Database['public']['Tables']['musics']['Row'], 'release_year'>

type MusicStatsRow = Pick<
	Database['public']['Tables']['musics']['Row'],
	'duration' | 'ismv' | 'id_youtube_music'
>

type MusicReleaseRow = Pick<
	Database['public']['Tables']['music_releases']['Row'],
	'release_id'
>

type CompanyRow = Pick<Database['public']['Tables']['companies']['Row'], 'id' | 'name'>

export function useSupabaseStatistics() {
	const supabase = useSupabaseClient()
	const toast = useToast()

	// Helper pour construire les filtres de date
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
					// Mois spécifique d'une année spécifique
					startDate = new Date(filters.year, filters.month, 1)
					endDate = new Date(filters.year, filters.month + 1, 0) // Dernier jour du mois
				} else if (filters.year) {
					// Tous les mois de l'année spécifiée
					startDate = new Date(filters.year, 0, 1)
					endDate = new Date(filters.year, 11, 31)
				} else {
					// Mois en cours
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

		// Override spécifique si une année est fournie sans période spécifique
		if (filters.year && filters.period === 'all') {
			startDate = new Date(filters.year, 0, 1)
			endDate = new Date(filters.year, 11, 31)
		}

		return { startDate, endDate }
	}

	// 📊 STATISTIQUES PAR ARTISTES

	// Statistiques générales avec fonctions SQL optimisées (version finale)
	const getArtistGeneralStats = async (filters: StatsFilters) => {
		const { startDate, endDate } = buildDateFilter(filters)

		try {
			// Initialisation des tableaux de statistiques
			const typeStats: Array<{ type: string; count: number }> = []
			const genderStats: Array<{ gender: string; count: number }> = []
			const statusStats: Array<{ status: string; count: number }> = []

			// Appel des fonctions SQL optimisées en parallèle
			const [demographicsData, topReleasesData, topMusicsData, artistsData] =
				await Promise.all([
					// Statistiques démographiques
					supabase.rpc('get_artist_demographics') as Promise<
						SupabaseResponse<RPCDemographicsItem[]>
					>,

					// Top artistes par releases avec filtrage temporel
					supabase.rpc('get_top_artists_by_releases', {
						filter_year: filters.year || null,
						start_date: startDate ? startDate.toISOString().split('T')[0] : null,
						end_date: endDate ? endDate.toISOString().split('T')[0] : null,
						limit_count: 10,
					}) as Promise<SupabaseResponse<RPCTopArtist[]>>,

					// Top artistes par musiques avec filtrage temporel
					supabase.rpc('get_top_artists_by_musics', {
						filter_year: filters.year || null,
						start_date: startDate ? startDate.toISOString().split('T')[0] : null,
						end_date: endDate ? endDate.toISOString().split('T')[0] : null,
						limit_count: 10,
					}) as Promise<SupabaseResponse<RPCTopArtist[]>>,

					// Données pour statistiques par genre et qualité
					supabase
						.from('artists')
						.select(
							'styles, verified, image, description, birth_date, debut_date, general_tags, type, gender',
						) as Promise<SupabaseResponse<ArtistStatsRow[]>>,
				])

			// Traitement des données démographiques
			demographicsData?.data?.forEach((item) => {
				switch (item.stat_type) {
					case 'type':
						typeStats.push({ type: item.category, count: item.count_value })
						break
					case 'gender':
						genderStats.push({ gender: item.category, count: item.count_value })
						break
					case 'status':
						statusStats.push({ status: item.category, count: item.count_value })
						break
				}
			})

			// Statistiques par genre musical
			const genreStats: Record<string, number> = {}
			const totalArtists = artistsData?.data?.length || 0

			artistsData?.data?.forEach((artist) => {
				if (artist.styles && artist.styles.length > 0) {
					artist.styles.forEach((style) => {
						genreStats[style] = (genreStats[style] || 0) + 1
					})
				} else {
					genreStats['Non défini'] = (genreStats['Non défini'] || 0) + 1
				}
			})

			// Statistiques de qualité des profils
			let verifiedCount = 0
			let withImageCount = 0
			let completeProfilesCount = 0

			artistsData?.data?.forEach((artist) => {
				if (artist.verified) verifiedCount++
				if (artist.image) withImageCount++

				// Profil complet = au moins 5 champs sur 7 remplis
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
				statusStats,
				genreStats: Object.entries(genreStats)
					.sort((a, b) => b[1] - a[1])
					.slice(0, 10)
					.map(([genre, count]) => ({ genre, count })),
				qualityStats: {
					verificationRate: Math.round((verifiedCount / totalArtists) * 100),
					imageRate: Math.round((withImageCount / totalArtists) * 100),
					completionRate: Math.round((completeProfilesCount / totalArtists) * 100),
					totalArtists,
					verifiedArtists: verifiedCount,
					artistsWithImages: withImageCount,
					completeProfiles: completeProfilesCount,
				},
				topReleases:
					topReleasesData?.data?.map((item: RPCTopArtist) => ({
						name: item.artist_name,
						count: item.release_count,
					})) || [],
				topMusics:
					topMusicsData?.data?.map((item: RPCTopArtist) => ({
						name: item.artist_name,
						count: item.music_count,
					})) || [],
			}
		} catch (error) {
			console.error('Erreur dans getArtistGeneralStats:', error)
			return {
				typeStats: [],
				genderStats: [],
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

	// Statistiques temporelles des artistes
	const getArtistTemporalStats = async () => {
		const { data: artistsData } = await supabase
			.from('artists')
			.select('created_at, debut_date, birth_date')

		const creationEvolution: Record<number, number> = {}
		const debutYears: Record<number, number> = {}
		const birthPeriods: Record<string, number> = {}

		artistsData?.forEach((artist: ArtistTemporalRow) => {
			// Évolution création
			if (artist.created_at) {
				const year = new Date(artist.created_at).getFullYear()
				creationEvolution[year] = (creationEvolution[year] || 0) + 1
			}

			// Année de début
			if (artist.debut_date) {
				const year = new Date(artist.debut_date).getFullYear()
				debutYears[year] = (debutYears[year] || 0) + 1
			}

			// Période de naissance
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

	// 📅 STATISTIQUES PAR ANNÉE
	const getYearlyStats = async () => {
		// Releases par année
		const { data: releasesData } = await supabase
			.from('releases')
			.select('year, type')
			.not('year', 'is', null)

		// Musiques par année
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

	// 🏢 STATISTIQUES PAR COMPAGNIE
	const getCompanyStats = async () => {
		// Top compagnies par nombre d'artistes
		const { data: companyArtistsData } = (await supabase.from('artist_companies').select(`
        company_id,
        relationship_type,
        companies(name)
      `)) as {
			data: Array<{
				company_id: string
				relationship_type: string | null
				companies: { name: string } | null
			}> | null
		}

		const companyArtistCount: Record<string, { name: string; count: number }> = {}
		const relationshipTypes: Record<string, number> = {}

		companyArtistsData?.forEach((relation) => {
			const companyName = relation.companies?.name || 'Inconnue'

			// Compter les artistes par compagnie
			if (!companyArtistCount[relation.company_id]) {
				companyArtistCount[relation.company_id] = {
					name: companyName,
					count: 0,
				}
			}
			companyArtistCount[relation.company_id]!.count++

			// Relations par type
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

	// 🎵 STATISTIQUES MUSICALES AVANCÉES
	const getMusicAdvancedStats = async () => {
		// Répartition par type de release
		const { data: releasesData } = await supabase.from('releases').select('type')

		// Durée moyenne par type d'album
		const { data: musicDurationData } = (await supabase.from('music_releases').select(`
        release_id,
        musics(duration),
        releases(type)
      `)) as {
			data: Array<{
				release_id: string
				musics: { duration: number } | null
				releases: { type: string } | null
			}> | null
		}

		// Nombre de tracks par release
		const { data: trackCountData } = await supabase
			.from('music_releases')
			.select('release_id')

		// Stats des musiques individuelles
		const { data: musicsData } = await supabase
			.from('musics')
			.select('duration, ismv, id_youtube_music')

		// Traitement
		const releaseTypes: Record<string, number> = {}
		releasesData?.forEach((release: ReleaseTypeRow) => {
			const type = release.type || 'UNKNOWN'
			releaseTypes[type] = (releaseTypes[type] || 0) + 1
		})

		// Durée moyenne par type de release
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

		// Nombre de tracks par release
		const tracksPerRelease: Record<string, number> = {}
		trackCountData?.forEach((item: MusicReleaseRow) => {
			tracksPerRelease[item.release_id] = (tracksPerRelease[item.release_id] || 0) + 1
		})

		// Stats musiques
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

	// FONCTION PRINCIPALE
	const getStatistics = async (filters: StatsFilters): Promise<DashboardStats> => {
		try {
			const { startDate, endDate } = buildDateFilter(filters)

			// Déterminer le type de période pour les graphiques temporels
			const isMonthlyView =
				filters.period === 'month' && filters.month !== null && filters.year
			const temporalPeriodType = isMonthlyView ? 'day' : 'month'

			// Appel des fonctions SQL optimisées en parallèle
			const [
				artistGeneral,
				generalStats,
				companiesData,
				releasesTemporalData,
				musicsTemporalData,
			] = await Promise.all([
				getArtistGeneralStats(filters),

				// Statistiques générales depuis fonction SQL
				supabase.rpc('get_general_stats', {
					filter_year: filters.year || null,
					start_date: startDate ? startDate.toISOString().split('T')[0] : null,
					end_date: endDate ? endDate.toISOString().split('T')[0] : null,
				}) as Promise<SupabaseResponse<RPCGeneralStats[]>>,

				// Companies simple (en attendant une fonction dédiée)
				supabase.from('companies').select('id, name').limit(10) as Promise<
					SupabaseResponse<CompanyRow[]>
				>,

				// Données temporelles des releases
				supabase.rpc('get_releases_temporal_stats', {
					period_type: temporalPeriodType,
					filter_year: filters.year || null,
					filter_month: isMonthlyView ? filters.month : null,
				}) as Promise<SupabaseResponse<RPCTemporalData[]>>,

				// Données temporelles des musiques
				supabase.rpc('get_musics_temporal_stats_with_fallback', {
					period_type: temporalPeriodType,
					filter_year: filters.year || null,
					filter_month: isMonthlyView ? filters.month : null,
				}) as Promise<SupabaseResponse<RPCTemporalData[]>>,
			])

			// Traitement des données depuis SQL
			const generalStatsData = generalStats?.data?.[0] || {
				total_artists: 0,
				total_releases: 0,
				total_musics: 0,
				total_companies: 0,
				active_artists: 0,
				inactive_artists: 0,
			}

			// Récupération des vraies statistiques des companies
			const companyStatsPromises =
				companiesData?.data?.map(async (comp) => {
					// Compter les artistes liés à cette company
					const { count: artistCount } = await supabase
						.from('artist_companies')
						.select('*', { count: 'exact', head: true })
						.eq('company_id', comp.id)

					// Compter les releases liées aux artistes de cette company
					const { count: releaseCount } = await supabase
						.from('releases')
						.select(
							`
            *,
            artist_releases!inner(
              artists!inner(
                artist_companies!inner(
                  company_id
                )
              )
            )
          `,
							{ count: 'exact', head: true },
						)
						.eq('artist_releases.artists.artist_companies.company_id', comp.id)

					return {
						company_id: comp.id,
						company_name: comp.name,
						artist_count: artistCount || 0,
						release_count: releaseCount || 0,
					}
				}) || []

			const companyStatsData = await Promise.all(companyStatsPromises)

			return {
				general: {
					title: "Vue d'ensemble",
					cards: [
						{
							title: 'Total Artistes',
							value: generalStatsData.total_artists || 0,
							icon: 'i-heroicons-user-group',
							color: 'blue',
						},
						{
							title: 'Total Releases',
							value: generalStatsData.total_releases || 0,
							icon: 'i-heroicons-musical-note',
							color: 'green',
						},
						{
							title: 'Total Musiques',
							value: generalStatsData.total_musics || 0,
							icon: 'i-heroicons-play',
							color: 'purple',
						},
						{
							title: 'Total Companies',
							value: generalStatsData.total_companies || 0,
							icon: 'i-heroicons-building-office',
							color: 'orange',
						},
					],
				},
				artists: {
					title: 'Statistiques par Artistes',
					cards: [
						{
							title: 'Artistes Solo',
							value: artistGeneral.typeStats.find((s) => s.type === 'SOLO')?.count || 0,
							icon: 'i-heroicons-user',
							color: 'blue',
						},
						{
							title: 'Groupes',
							value: artistGeneral.typeStats.find((s) => s.type === 'GROUP')?.count || 0,
							icon: 'i-heroicons-user-group',
							color: 'green',
						},
						{
							title: 'Profils Vérifiés',
							value: `${artistGeneral.qualityStats.verificationRate}%`,
							icon: 'i-heroicons-check-badge',
							color: 'green',
						},
						{
							title: 'Profils Complets',
							value: `${artistGeneral.qualityStats.completionRate}%`,
							icon: 'i-heroicons-clipboard-document-check',
							color: 'blue',
						},
					],
					charts: [
						{
							title: 'Répartition par Genre Musical',
							data: {
								labels: artistGeneral.genreStats.map((s) => s.genre),
								data: artistGeneral.genreStats.map((s) => s.count),
								type: 'bar',
							},
							description: 'Top 10 des genres musicaux les plus représentés',
						},
						{
							title: 'Répartition Hommes/Femmes',
							data: {
								labels: artistGeneral.genderStats.map((s) => s.gender),
								data: artistGeneral.genderStats.map((s) => s.count),
								type: 'doughnut',
							},
						},
						{
							title: 'Qualité des Profils',
							data: {
								labels: ['Vérifiés', 'Avec Image', 'Profils Complets'],
								data: [
									artistGeneral.qualityStats.verificationRate,
									artistGeneral.qualityStats.imageRate,
									artistGeneral.qualityStats.completionRate,
								],
								type: 'bar',
							},
							description: 'Pourcentages de complétude et qualité des profils',
						},
					],
					topLists: [
						{
							title: 'Top Artistes - Releases',
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
							title: 'Top Artistes - Musiques',
							items: artistGeneral.topMusics.map(
								(artist: { name: string; count: number }, index: number) => ({
									id: `music-${index}`,
									name: artist.name,
									value: artist.count,
									subtitle: `${artist.count} musiques`,
								}),
							),
						},
					],
				},
				companies: {
					title: 'Statistiques des Companies',
					cards: [
						{
							title: 'Total Companies',
							value: generalStatsData.total_companies || 0,
							icon: 'i-heroicons-building-office',
							color: 'orange',
						},
					],
					topLists: [
						{
							title: 'Top Companies',
							items: companyStatsData.slice(0, 10).map((comp, index) => ({
								id: comp.company_id || index.toString(),
								name: comp.company_name || 'Inconnu',
								value: comp.artist_count || 0,
								subtitle: `${comp.artist_count || 0} artistes, ${comp.release_count || 0} releases`,
							})),
						},
					],
				},
				music: {
					title: 'Statistiques Musicales',
					cards: [
						{
							title: 'Total Musiques',
							value: generalStatsData.total_musics || 0,
							icon: 'i-heroicons-play',
							color: 'purple',
						},
						{
							title: 'Total Releases',
							value: generalStatsData.total_releases || 0,
							icon: 'i-heroicons-musical-note',
							color: 'green',
						},
					],
					charts: [
						{
							title: `Évolution des Releases ${isMonthlyView ? 'par jour' : 'par mois'}`,
							data: {
								labels:
									releasesTemporalData?.data?.map(
										(item: RPCTemporalData) => item.period_label,
									) || [],
								data:
									releasesTemporalData?.data?.map(
										(item: RPCTemporalData) => item.count_value,
									) || [],
								type: 'line',
							},
							description: isMonthlyView
								? 'Nombre de releases sorties chaque jour du mois'
								: 'Nombre de releases sorties chaque mois',
						},
						{
							title: `Évolution des Musiques ${isMonthlyView ? 'par jour' : 'par mois'}`,
							data: {
								labels:
									musicsTemporalData?.data?.map(
										(item: RPCTemporalData) => item.period_label,
									) || [],
								data:
									musicsTemporalData?.data?.map(
										(item: RPCTemporalData) => item.count_value,
									) || [],
								type: 'line',
							},
							description: isMonthlyView
								? 'Nombre de musiques sorties chaque jour du mois'
								: 'Nombre de musiques sorties chaque mois',
						},
					],
				},
			}
		} catch (error) {
			console.error('Erreur lors du chargement des statistiques:', error)
			toast.add({
				title: 'Erreur',
				description: 'Impossible de charger les statistiques',
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
