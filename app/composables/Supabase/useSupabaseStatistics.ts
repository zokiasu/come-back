import type {
  DashboardStats,
  StatsFilters,
  TopContributor,
  ContributionTypeStats,
  UserRoleStats
} from '~/types/stats'

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

  // Helper pour construire les conditions SQL de filtrage temporel
  const buildDateConditions = (filters: StatsFilters, releaseTable = 'r', musicTable = 'm') => {
    const { startDate, endDate } = buildDateFilter(filters)
    let releaseCondition = '1=1'
    let musicCondition = '1=1'

    if (filters.year && (filters.period === 'year' || filters.period === 'all')) {
      releaseCondition = `EXTRACT(YEAR FROM ${releaseTable}.date) = ${filters.year}`
      musicCondition = `${musicTable}.release_year = ${filters.year}`
    } else if (startDate && endDate) {
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]
      releaseCondition = `${releaseTable}.date >= '${startDateStr}' AND ${releaseTable}.date <= '${endDateStr}'`
      musicCondition = `${musicTable}.date >= '${startDateStr}' AND ${musicTable}.date <= '${endDateStr}'`
    }

    return { releaseCondition, musicCondition }
  }

  // Statistiques générales avec fonctions SQL optimisées (version finale)
  const getArtistGeneralStats = async (filters: StatsFilters) => {
    const { startDate, endDate } = buildDateFilter(filters)

    try {
      // Appel des fonctions SQL optimisées en parallèle
      const [demographicsData, topReleasesData, topMusicsData] = await Promise.all([
        // Statistiques démographiques
        supabase.rpc('get_artist_demographics'),

        // Top artistes par releases avec filtrage temporel
        supabase.rpc('get_top_artists_by_releases', {
          filter_year: filters.year || null,
          start_date: startDate ? startDate.toISOString().split('T')[0] : null,
          end_date: endDate ? endDate.toISOString().split('T')[0] : null,
          limit_count: 10
        }),

        // Top artistes par musiques avec filtrage temporel
        supabase.rpc('get_top_artists_by_musics', {
          filter_year: filters.year || null,
          start_date: startDate ? startDate.toISOString().split('T')[0] : null,
          end_date: endDate ? endDate.toISOString().split('T')[0] : null,
          limit_count: 10
        })
      ])

      // Traitement des statistiques démographiques (directement depuis SQL)
      const typeStats = []
      const genderStats = []
      const statusStats = []

      demographicsData?.data?.forEach(item => {
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

      return {
        typeStats,
        genderStats,
        statusStats,
        topReleases: topReleasesData?.data?.map(item => ({
          name: item.artist_name,
          count: item.release_count
        })) || [],
        topMusics: topMusicsData?.data?.map(item => ({
          name: item.artist_name,
          count: item.music_count
        })) || []
      }
    } catch (error) {
      console.error('Erreur dans getArtistGeneralStats:', error)
      return {
        typeStats: [],
        genderStats: [],
        statusStats: [],
        topReleases: [],
        topMusics: []
      }
    }
  }

  // Statistiques temporelles des artistes
  const getArtistTemporalStats = async () => {
    const { data: artistsData } = await supabase
      .from('artists')
      .select('created_at, debut_date, birth_date')

    const creationEvolution = new Map()
    const debutYears = new Map()
    const birthPeriods = new Map()

    artistsData?.forEach(artist => {
      // Évolution création
      if (artist.created_at) {
        const year = new Date(artist.created_at).getFullYear()
        creationEvolution.set(year, (creationEvolution.get(year) || 0) + 1)
      }

      // Année de début
      if (artist.debut_date) {
        const year = new Date(artist.debut_date).getFullYear()
        debutYears.set(year, (debutYears.get(year) || 0) + 1)
      }

      // Période de naissance
      if (artist.birth_date) {
        const year = new Date(artist.birth_date).getFullYear()
        const decade = Math.floor(year / 10) * 10
        const period = `${decade}s`
        birthPeriods.set(period, (birthPeriods.get(period) || 0) + 1)
      }
    })

    return {
      creationEvolution: Array.from(creationEvolution.entries())
        .sort(([a], [b]) => a - b)
        .map(([year, count]) => ({ year, count })),
      debutYears: Array.from(debutYears.entries())
        .sort(([a], [b]) => a - b)
        .map(([year, count]) => ({ year, count })),
      birthPeriods: Array.from(birthPeriods.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, count]) => ({ period, count }))
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

    const releasesByYear = new Map()
    const releaseTypesByYear = new Map()
    const musicsByYear = new Map()

    releasesData?.forEach(release => {
      const year = release.year!
      releasesByYear.set(year, (releasesByYear.get(year) || 0) + 1)

      if (!releaseTypesByYear.has(year)) {
        releaseTypesByYear.set(year, { ALBUM: 0, SINGLE: 0, EP: 0, COMPILATION: 0 })
      }
      const yearData = releaseTypesByYear.get(year)
      yearData[release.type || 'SINGLE']++
    })

    musicsData?.forEach(music => {
      const year = music.release_year!
      musicsByYear.set(year, (musicsByYear.get(year) || 0) + 1)
    })

    return {
      releasesByYear: Array.from(releasesByYear.entries())
        .sort(([a], [b]) => a - b)
        .map(([year, count]) => ({ year, count })),
      musicsByYear: Array.from(musicsByYear.entries())
        .sort(([a], [b]) => a - b)
        .map(([year, count]) => ({ year, count })),
      releaseTypesByYear: Array.from(releaseTypesByYear.entries())
        .sort(([a], [b]) => a - b)
        .map(([year, types]) => ({ year, ...types }))
    }
  }

  // 🏢 STATISTIQUES PAR COMPAGNIE
  const getCompanyStats = async () => {
    // Top compagnies par nombre d'artistes
    const { data: companyArtistsData } = await supabase
      .from('artist_companies')
      .select(`
        company_id,
        relationship_type,
        companies(name)
      `)

    const companyArtistCount = new Map()
    const relationshipTypes = new Map()

    companyArtistsData?.forEach(relation => {
      const companyName = relation.companies?.name || 'Inconnue'

      // Compter les artistes par compagnie
      if (!companyArtistCount.has(relation.company_id)) {
        companyArtistCount.set(relation.company_id, {
          name: companyName,
          count: 0
        })
      }
      companyArtistCount.get(relation.company_id).count++

      // Relations par type
      const relType = relation.relationship_type || 'UNKNOWN'
      relationshipTypes.set(relType, (relationshipTypes.get(relType) || 0) + 1)
    })

    return {
      topCompanies: Array.from(companyArtistCount.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      relationshipTypes: Array.from(relationshipTypes.entries())
        .map(([type, count]) => ({ type, count }))
    }
  }

  // 🎵 STATISTIQUES MUSICALES AVANCÉES
  const getMusicAdvancedStats = async () => {
    // Répartition par type de release
    const { data: releasesData } = await supabase
      .from('releases')
      .select('type')

    // Durée moyenne par type d'album
    const { data: musicDurationData } = await supabase
      .from('music_releases')
      .select(`
        release_id,
        musics(duration),
        releases(type)
      `)

    // Nombre de tracks par release
    const { data: trackCountData } = await supabase
      .from('music_releases')
      .select('release_id')

    // Stats des musiques individuelles
    const { data: musicsData } = await supabase
      .from('musics')
      .select('duration, ismv, id_youtube_music')

    // Traitement
    const releaseTypes = new Map()
    releasesData?.forEach(release => {
      const type = release.type || 'UNKNOWN'
      releaseTypes.set(type, (releaseTypes.get(type) || 0) + 1)
    })

    // Durée moyenne par type de release
    const durationByType = new Map()
    musicDurationData?.forEach(item => {
      const type = item.releases?.type || 'UNKNOWN'
      const duration = item.musics?.duration

      if (duration) {
        if (!durationByType.has(type)) {
          durationByType.set(type, { total: 0, count: 0 })
        }
        const typeData = durationByType.get(type)
        typeData.total += duration
        typeData.count++
      }
    })

    // Nombre de tracks par release
    const tracksPerRelease = new Map()
    trackCountData?.forEach(item => {
      tracksPerRelease.set(item.release_id, (tracksPerRelease.get(item.release_id) || 0) + 1)
    })

    // Stats musiques
    let totalDuration = 0
    let durationCount = 0
    let mvCount = 0
    let youtubeMusicCount = 0
    const totalMusics = musicsData?.length || 0

    musicsData?.forEach(music => {
      if (music.duration) {
        totalDuration += music.duration
        durationCount++
      }
      if (music.ismv) mvCount++
      if (music.id_youtube_music) youtubeMusicCount++
    })

    return {
      releaseTypes: Array.from(releaseTypes.entries())
        .map(([type, count]) => ({ type, count })),
      averageDurationByType: Array.from(durationByType.entries())
        .map(([type, data]) => ({
          type,
          averageDuration: Math.round(data.total / data.count)
        })),
      averageTracksPerRelease: Array.from(tracksPerRelease.values())
        .reduce((sum, count) => sum + count, 0) / tracksPerRelease.size,
      averageSongDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
      mvPercentage: Math.round((mvCount / totalMusics) * 100),
      youtubeMusicPercentage: Math.round((youtubeMusicCount / totalMusics) * 100)
    }
  }


  // FONCTION PRINCIPALE
  const getStatistics = async (filters: StatsFilters): Promise<DashboardStats> => {
    try {
      const { startDate, endDate } = buildDateFilter(filters)

      // Déterminer le type de période pour les graphiques temporels
      const isMonthlyView = filters.period === 'month' && filters.month !== null && filters.year
      const temporalPeriodType = isMonthlyView ? 'day' : 'month'

      // Appel des fonctions SQL optimisées en parallèle
      const [
        artistGeneral,
        generalStats,
        companiesData,
        releasesTemporalData,
        musicsTemporalData
      ] = await Promise.all([
        getArtistGeneralStats(filters),

        // Statistiques générales depuis fonction SQL
        supabase.rpc('get_general_stats', {
          filter_year: filters.year || null,
          start_date: startDate ? startDate.toISOString().split('T')[0] : null,
          end_date: endDate ? endDate.toISOString().split('T')[0] : null
        }),

        // Companies simple (en attendant une fonction dédiée)
        supabase.from('companies').select('id, name').limit(10),

        // Données temporelles des releases
        supabase.rpc('get_releases_temporal_stats', {
          period_type: temporalPeriodType,
          filter_year: filters.year || null,
          filter_month: isMonthlyView ? filters.month : null
        }),

        // Données temporelles des musiques
        supabase.rpc('get_musics_temporal_stats_with_fallback', {
          period_type: temporalPeriodType,
          filter_year: filters.year || null,
          filter_month: isMonthlyView ? filters.month : null
        })
      ])

      // Traitement des données depuis SQL
      const generalStatsData = generalStats?.data?.[0] || {
        total_artists: 0,
        total_releases: 0,
        total_musics: 0,
        total_companies: 0,
        active_artists: 0,
        inactive_artists: 0
      }

      const companyStatsData = companiesData?.data?.map((comp, index) => ({
        company_id: comp.id,
        company_name: comp.name,
        artist_count: Math.floor(Math.random() * 5) + 1, // À remplacer par vraie fonction SQL
        release_count: Math.floor(Math.random() * 10) + 1 // À remplacer par vraie fonction SQL
      })) || []

      return {
        general: {
          title: 'Vue d\'ensemble',
          cards: [
            {
              title: 'Total Artistes',
              value: generalStatsData.total_artists || 0,
              icon: 'i-heroicons-user-group',
              color: 'blue'
            },
            {
              title: 'Total Releases',
              value: generalStatsData.total_releases || 0,
              icon: 'i-heroicons-musical-note',
              color: 'green'
            },
            {
              title: 'Total Musiques',
              value: generalStatsData.total_musics || 0,
              icon: 'i-heroicons-play',
              color: 'purple'
            },
            {
              title: 'Total Companies',
              value: generalStatsData.total_companies || 0,
              icon: 'i-heroicons-building-office',
              color: 'orange'
            }
          ]
        },
        artists: {
          title: 'Statistiques par Artistes',
          cards: [
            {
              title: 'Artistes Solo',
              value: artistGeneral.typeStats.find(s => s.type === 'SOLO')?.count || 0,
              icon: 'i-heroicons-user',
              color: 'blue'
            },
            {
              title: 'Groupes',
              value: artistGeneral.typeStats.find(s => s.type === 'GROUP')?.count || 0,
              icon: 'i-heroicons-user-group',
              color: 'green'
            },
            {
              title: 'Artistes Actifs',
              value: generalStatsData.active_artists || 0,
              icon: 'i-heroicons-check-circle',
              color: 'green'
            },
            {
              title: 'Artistes Inactifs',
              value: generalStatsData.inactive_artists || 0,
              icon: 'i-heroicons-x-circle',
              color: 'red'
            }
          ],
          charts: [
            {
              title: 'Répartition par Genre',
              data: {
                labels: artistGeneral.genderStats.map(s => s.gender),
                data: artistGeneral.genderStats.map(s => s.count),
                type: 'doughnut'
              }
            },
            {
              title: 'Statut de Carrière',
              data: {
                labels: artistGeneral.statusStats.map(s => s.status),
                data: artistGeneral.statusStats.map(s => s.count),
                type: 'pie'
              }
            },
            {
              title: 'Évolution des Releases',
              data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
                data: [10, 15, 12, 20, 18, 25],
                type: 'line'
              },
              description: 'Données temporaires - en développement'
            }
          ],
          topLists: [
            {
              title: 'Top Artistes - Releases',
              items: artistGeneral.topReleases.map((artist, index) => ({
                id: `release-${index}`,
                name: artist.name,
                value: artist.count,
                subtitle: `${artist.count} releases`
              }))
            },
            {
              title: 'Top Artistes - Musiques',
              items: artistGeneral.topMusics.map((artist, index) => ({
                id: `music-${index}`,
                name: artist.name,
                value: artist.count,
                subtitle: `${artist.count} musiques`
              }))
            }
          ]
        },
        companies: {
          title: 'Statistiques des Companies',
          cards: [
            {
              title: 'Total Companies',
              value: generalStatsData.total_companies || 0,
              icon: 'i-heroicons-building-office',
              color: 'orange'
            }
          ],
          topLists: [
            {
              title: 'Top Companies',
              items: companyStatsData.slice(0, 10).map((comp, index) => ({
                id: comp.company_id || index.toString(),
                name: comp.company_name || 'Inconnu',
                value: comp.artist_count || 0,
                subtitle: `${comp.artist_count || 0} artistes, ${comp.release_count || 0} releases`
              }))
            }
          ]
        },
        music: {
          title: 'Statistiques Musicales',
          cards: [
            {
              title: 'Total Musiques',
              value: generalStatsData.total_musics || 0,
              icon: 'i-heroicons-play',
              color: 'purple'
            },
            {
              title: 'Total Releases',
              value: generalStatsData.total_releases || 0,
              icon: 'i-heroicons-musical-note',
              color: 'green'
            }
          ],
          charts: [
            {
              title: `Évolution des Releases ${isMonthlyView ? 'par jour' : 'par mois'}`,
              data: {
                labels: releasesTemporalData?.data?.map(item => item.period_label) || [],
                data: releasesTemporalData?.data?.map(item => item.count_value) || [],
                type: 'line'
              },
              description: isMonthlyView
                ? 'Nombre de releases sorties chaque jour du mois'
                : 'Nombre de releases sorties chaque mois'
            },
            {
              title: `Évolution des Musiques ${isMonthlyView ? 'par jour' : 'par mois'}`,
              data: {
                labels: musicsTemporalData?.data?.map(item => item.period_label) || [],
                data: musicsTemporalData?.data?.map(item => item.count_value) || [],
                type: 'line'
              },
              description: isMonthlyView
                ? 'Nombre de musiques sorties chaque jour du mois'
                : 'Nombre de musiques sorties chaque mois'
            }
          ]
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error)
      toast.add({
        title: 'Erreur',
        description: 'Impossible de charger les statistiques',
        color: 'red'
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
    getMusicAdvancedStats
  }
}