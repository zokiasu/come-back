import type { QueryOptions, FilterOptions, ContributionType } from '~/types'
import type { Database, TablesInsert, TablesUpdate, Tables } from '~/types/supabase'

type UserArtistContribution = Tables<'user_artist_contributions'> & {
	user?: Tables<'users'>
	artist?: Tables<'artists'>
}

interface ContributionsResponse {
	contributions: UserArtistContribution[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export function useSupabaseUserArtistContributions() {
	const supabase = useSupabaseClient<Database>()
	const toast = useToast()

	// Ajouter une contribution utilisateur pour un artiste
	const addUserArtistContribution = async (
		userId: string,
		artistId: string,
		contributionType: 'CREATOR' | 'EDITOR' = 'EDITOR',
	) => {
		// Vérifier si la contribution existe déjà
		const { data: existing } = await supabase
			.from('user_artist_contributions')
			.select('*')
			.eq('user_id', userId)
			.eq('artist_id', artistId)
			.single()

		if (existing) {
			// Mettre à jour le type de contribution si différent
			if (existing.contribution_type !== contributionType) {
				const { data, error } = await supabase
					.from('user_artist_contributions')
					.update({ contribution_type: contributionType })
					.eq('user_id', userId)
					.eq('artist_id', artistId)
					.select()
					.single()

				if (error) {
					console.error('Erreur lors de la mise à jour de la contribution:', error)
					toast.add({
						title: 'Erreur',
						description: 'Erreur lors de la mise à jour de la contribution',
						color: 'error',
					})
					throw error
				}

				return data
			}
			return existing
		}

		// Créer une nouvelle contribution
		const { data, error } = await supabase
			.from('user_artist_contributions')
			.insert({
				user_id: userId,
				artist_id: artistId,
				contribution_type: contributionType,
			})
			.select()
			.single()

		if (error) {
			console.error('Erreur lors de la création de la contribution:', error)
			toast.add({
				title: 'Erreur',
				description: 'Erreur lors de la création de la contribution',
				color: 'error',
			})
			throw error
		}

		return data
	}

	// Supprimer une contribution utilisateur
	const removeUserArtistContribution = async (userId: string, artistId: string) => {
		const { error } = await supabase
			.from('user_artist_contributions')
			.delete()
			.eq('user_id', userId)
			.eq('artist_id', artistId)

		if (error) {
			console.error('Erreur lors de la suppression de la contribution:', error)
			toast.add({
				title: 'Erreur',
				description: 'Erreur lors de la suppression de la contribution',
				color: 'error',
			})
			throw error
		}

		return true
	}

	// Récupérer toutes les contributions avec pagination
	const getAllContributions = async (
		options?: QueryOptions &
			FilterOptions & {
				userId?: string
				artistId?: string
				contributionType?: 'CREATOR' | 'EDITOR'
			},
	): Promise<ContributionsResponse> => {
		let query = supabase.from('user_artist_contributions').select(
			`
				*,
				user:users!user_artist_contributions_user_id_fkey(
					id,
					name,
					email,
					photo_url
				),
				artist:artists!user_artist_contributions_artist_id_fkey(
					id,
					name,
					image
				)
			`,
			{ count: 'exact' },
		)

		// Filtres
		if (options?.userId) {
			query = query.eq('user_id', options.userId)
		}

		if (options?.artistId) {
			query = query.eq('artist_id', options.artistId)
		}

		if (options?.contributionType) {
			query = query.eq('contribution_type', options.contributionType)
		}

		// Tri
		if (options?.orderBy) {
			query = query.order(options.orderBy, {
				ascending: options.orderDirection === 'asc',
			})
		} else {
			query = query.order('created_at', { ascending: false })
		}

		// Pagination
		if (options?.limit) {
			query = query.limit(options.limit)
		}

		if (options?.offset) {
			query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
		}

		const { data, error, count } = await query

		if (error) {
			console.error('Erreur lors de la récupération des contributions:', error)
			return {
				contributions: [],
				total: 0,
				page: 1,
				limit: 10,
				totalPages: 1,
			}
		}

		return {
			contributions: (data || []) as any,
			total: count || 0,
			page: options?.offset ? Math.floor(options.offset / (options.limit || 10)) + 1 : 1,
			limit: options?.limit || 10,
			totalPages: Math.ceil((count || 0) / (options?.limit || 10)),
		}
	}

	// Récupérer les contributions d'un utilisateur spécifique
	const getUserContributions = async (userId: string) => {
		const { data, error } = await supabase
			.from('user_artist_contributions')
			.select(
				`
				*,
				artist:artists!user_artist_contributions_artist_id_fkey(
					id,
					name,
					image,
					type,
					verified
				)
			`,
			)
			.eq('user_id', userId)
			.order('created_at', { ascending: false })

		if (error) {
			console.error(
				'Erreur lors de la récupération des contributions utilisateur:',
				error,
			)
			throw error
		}

		return data || []
	}

	// Récupérer les contributeurs d'un artiste spécifique
	const getArtistContributors = async (artistId: string) => {
		const { data, error } = await supabase
			.from('user_artist_contributions')
			.select(
				`
				*,
				user:users!user_artist_contributions_user_id_fkey(
					id,
					name,
					email,
					photo_url,
					role
				)
			`,
			)
			.eq('artist_id', artistId)
			.order('created_at', { ascending: true })

		if (error) {
			console.error('Erreur lors de la récupération des contributeurs:', error)
			throw error
		}

		return data || []
	}

	// Statistiques des contributions d'un utilisateur
	const getUserContributionStats = async (userId: string) => {
		const { data, error } = await supabase
			.from('user_artist_contributions')
			.select('contribution_type')
			.eq('user_id', userId)

		if (error) {
			console.error('Erreur lors de la récupération des statistiques:', error)
			throw error
		}

		const stats = {
			total: data?.length || 0,
			created: data?.filter((c) => c.contribution_type === 'CREATOR').length || 0,
			edited: data?.filter((c) => c.contribution_type === 'EDITOR').length || 0,
		}

		return stats
	}

	// Récupérer les contributeurs les plus actifs
	const getTopContributors = async (limit: number = 10) => {
		const { data, error } = await supabase.rpc('get_top_contributors', {
			contribution_limit: limit,
		})

		if (error) {
			console.error('Erreur lors de la récupération des top contributeurs:', error)

			// Fallback: requête manuelle si la fonction RPC n'existe pas
			const { data: fallbackData, error: fallbackError } = await supabase.from(
				'user_artist_contributions',
			).select(`
					user_id,
					contribution_type,
					user:users!user_artist_contributions_user_id_fkey(
						id,
						name,
						photo_url
					)
				`)

			if (fallbackError) {
				throw fallbackError
			}

			// Grouper et compter manuellement
			const contributorMap = new Map()
			fallbackData?.forEach((contrib) => {
				const userId = contrib.user_id
				if (!contributorMap.has(userId)) {
					contributorMap.set(userId, {
						user: contrib.user,
						total: 0,
						created: 0,
						edited: 0,
					})
				}
				const stats = contributorMap.get(userId)
				stats.total++
				if (contrib.contribution_type === 'CREATOR') {
					stats.created++
				} else {
					stats.edited++
				}
			})

			return Array.from(contributorMap.values())
				.sort((a, b) => b.total - a.total)
				.slice(0, limit)
		}

		return data || []
	}

	return {
		addUserArtistContribution,
		removeUserArtistContribution,
		getAllContributions,
		getUserContributions,
		getArtistContributors,
		getUserContributionStats,
		getTopContributors,
	}
}
