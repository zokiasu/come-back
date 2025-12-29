import type {
	UserRanking,
	UserRankingItem,
	UserRankingWithItems,
	UserRankingWithPreview,
	Music,
} from '~/types'
import type { Database } from '~/types/supabase'

export function useSupabaseRanking() {
	const supabase = useSupabaseClient<Database>()
	const userStore = useUserStore()
	const toast = useToast()

	/**
	 * Récupère tous les rankings de l'utilisateur connecté
	 */
	const getUserRankings = async (): Promise<UserRankingWithPreview[]> => {
		console.log('[getUserRankings] Starting...', { userId: userStore.userDataStore?.id })

		if (!userStore.userDataStore?.id) {
			console.log('[getUserRankings] No user ID, returning empty array')
			return []
		}

		const { data: rankings, error } = await supabase
			.from('user_rankings')
			.select('*')
			.eq('user_id', userStore.userDataStore.id)
			.order('updated_at', { ascending: false })

		console.log('[getUserRankings] Query result:', { rankings, error })

		if (error) {
			console.error('Erreur lors de la récupération des rankings:', error)
			toast.add({
				title: 'Erreur',
				description: 'Impossible de charger vos rankings',
				color: 'error',
			})
			return []
		}

		// Pour chaque ranking, récupérer le nombre d'items et les 4 premières thumbnails
		const rankingsWithPreview: UserRankingWithPreview[] = await Promise.all(
			(rankings as UserRanking[]).map(async (ranking) => {
				const { data: items, count } = await supabase
					.from('user_ranking_items')
					.select('music_id, musics(thumbnails)', { count: 'exact' })
					.eq('ranking_id', ranking.id)
					.order('position', { ascending: true })
					.limit(4)

				const thumbnails = (items || []).map((item: any) => {
					const music = item.musics
					if (music?.thumbnails && Array.isArray(music.thumbnails)) {
						return music.thumbnails[2]?.url || music.thumbnails[0]?.url || null
					}
					return null
				})

				return {
					...ranking,
					item_count: count || 0,
					preview_thumbnails: thumbnails,
				}
			})
		)

		return rankingsWithPreview
	}

	/**
	 * Récupère un ranking par son ID avec tous ses items
	 */
	const getRankingById = async (id: string): Promise<UserRankingWithItems | null> => {
		console.log('[getRankingById] Starting...', { id })

		const { data: ranking, error: rankingError } = await supabase
			.from('user_rankings')
			.select('*')
			.eq('id', id)
			.single()

		console.log('[getRankingById] Ranking result:', { ranking, rankingError })

		if (rankingError) {
			console.error('Erreur lors de la récupération du ranking:', rankingError)
			return null
		}

		// Récupérer les items avec les infos des musiques
		const { data: items, error: itemsError } = await supabase
			.from('user_ranking_items')
			.select(`
				*,
				music:musics(
					*,
					artists:music_artists(
						artist:artists(id, name, image)
					)
				)
			`)
			.eq('ranking_id', id)
			.order('position', { ascending: true })

		if (itemsError) {
			console.error('Erreur lors de la récupération des items:', itemsError)
			return null
		}

		// Transformer les données
		const transformedItems = (items || []).map((item: any) => ({
			...item,
			music: {
				...item.music,
				artists: item.music?.artists?.map((a: any) => a.artist).filter(Boolean) || [],
			},
		}))

		return {
			...(ranking as UserRanking),
			items: transformedItems,
			item_count: transformedItems.length,
		}
	}

	/**
	 * Crée un nouveau ranking
	 */
	const createRanking = async (
		name: string,
		description?: string
	): Promise<UserRanking | null> => {
		console.log('[createRanking] Starting...', { userId: userStore.userDataStore?.id, name })

		if (!userStore.userDataStore?.id) {
			console.log('[createRanking] No user ID')
			toast.add({
				title: 'Erreur',
				description: 'Vous devez être connecté',
				color: 'error',
			})
			return null
		}

		const { data, error } = await supabase
			.from('user_rankings')
			.insert({
				user_id: userStore.userDataStore.id,
				name,
				description: description || null,
				is_public: false,
			})
			.select()
			.single()

		console.log('[createRanking] Result:', { data, error })

		if (error) {
			console.error('Erreur lors de la création du ranking:', error)
			toast.add({
				title: 'Erreur',
				description: 'Impossible de créer le ranking',
				color: 'error',
			})
			return null
		}

		toast.add({
			title: 'Succès',
			description: 'Ranking créé avec succès',
			color: 'success',
		})

		return data as UserRanking
	}

	/**
	 * Met à jour un ranking
	 */
	const updateRanking = async (
		id: string,
		updates: Partial<Pick<UserRanking, 'name' | 'description' | 'is_public'>>
	): Promise<UserRanking | null> => {
		const { data, error } = await supabase
			.from('user_rankings')
			.update(updates)
			.eq('id', id)
			.select()
			.single()

		if (error) {
			console.error('Erreur lors de la mise à jour du ranking:', error)
			toast.add({
				title: 'Erreur',
				description: 'Impossible de mettre à jour le ranking',
				color: 'error',
			})
			return null
		}

		return data as UserRanking
	}

	/**
	 * Supprime un ranking
	 */
	const deleteRanking = async (id: string): Promise<boolean> => {
		const { error } = await supabase.from('user_rankings').delete().eq('id', id)

		if (error) {
			console.error('Erreur lors de la suppression du ranking:', error)
			toast.add({
				title: 'Erreur',
				description: 'Impossible de supprimer le ranking',
				color: 'error',
			})
			return false
		}

		toast.add({
			title: 'Succès',
			description: 'Ranking supprimé',
			color: 'success',
		})

		return true
	}

	/**
	 * Ajoute une musique au ranking
	 */
	const addMusicToRanking = async (
		rankingId: string,
		musicId: string
	): Promise<UserRankingItem | null> => {
		// Récupérer la position maximale actuelle
		const { data: maxPositionData } = await supabase
			.from('user_ranking_items')
			.select('position')
			.eq('ranking_id', rankingId)
			.order('position', { ascending: false })
			.limit(1)
			.single()

		const newPosition = (maxPositionData?.position || 0) + 1

		if (newPosition > 100) {
			toast.add({
				title: 'Limite atteinte',
				description: 'Un ranking ne peut pas contenir plus de 100 musiques',
				color: 'warning',
			})
			return null
		}

		const { data, error } = await supabase
			.from('user_ranking_items')
			.insert({
				ranking_id: rankingId,
				music_id: musicId,
				position: newPosition,
			})
			.select()
			.single()

		if (error) {
			if (error.code === '23505') {
				// Duplicate key
				toast.add({
					title: 'Déjà présent',
					description: 'Cette musique est déjà dans le ranking',
					color: 'warning',
				})
			} else {
				console.error("Erreur lors de l'ajout de la musique:", error)
				toast.add({
					title: 'Erreur',
					description: "Impossible d'ajouter la musique",
					color: 'error',
				})
			}
			return null
		}

		// Mettre à jour updated_at du ranking parent
		await supabase
			.from('user_rankings')
			.update({ updated_at: new Date().toISOString() })
			.eq('id', rankingId)

		return data as UserRankingItem
	}

	/**
	 * Retire une musique du ranking
	 */
	const removeMusicFromRanking = async (
		rankingId: string,
		musicId: string
	): Promise<boolean> => {
		// Récupérer la position de l'item à supprimer
		const { data: itemToDelete } = await supabase
			.from('user_ranking_items')
			.select('position')
			.eq('ranking_id', rankingId)
			.eq('music_id', musicId)
			.single()

		if (!itemToDelete) return false

		// Supprimer l'item
		const { error } = await supabase
			.from('user_ranking_items')
			.delete()
			.eq('ranking_id', rankingId)
			.eq('music_id', musicId)

		if (error) {
			console.error('Erreur lors de la suppression de la musique:', error)
			toast.add({
				title: 'Erreur',
				description: 'Impossible de retirer la musique',
				color: 'error',
			})
			return false
		}

		// Réajuster les positions des items suivants
		await supabase.rpc('reorder_ranking_items_after_delete', {
			p_ranking_id: rankingId,
			p_deleted_position: itemToDelete.position,
		})

		// Mettre à jour updated_at du ranking parent
		await supabase
			.from('user_rankings')
			.update({ updated_at: new Date().toISOString() })
			.eq('id', rankingId)

		return true
	}

	/**
	 * Réordonne les items du ranking
	 */
	const reorderRankingItems = async (
		rankingId: string,
		items: { id: string; position: number }[]
	): Promise<boolean> => {
		try {
			// Utiliser la fonction RPC atomique pour éviter les conflits 409
			const { error } = await supabase.rpc('reorder_ranking_items_atomic', {
				p_ranking_id: rankingId,
				p_items: items,
			})

			if (error) {
				throw error
			}

			return true
		} catch (error) {
			console.error('Erreur lors du réordonnancement:', error)
			toast.add({
				title: 'Erreur',
				description: 'Impossible de réordonner les musiques',
				color: 'error',
			})
			return false
		}
	}

	/**
	 * Vérifie si une musique est dans un ranking
	 */
	const isMusicInRanking = async (
		rankingId: string,
		musicId: string
	): Promise<boolean> => {
		const { data } = await supabase
			.from('user_ranking_items')
			.select('id')
			.eq('ranking_id', rankingId)
			.eq('music_id', musicId)
			.single()

		return !!data
	}

	/**
	 * Récupère un ranking public par son ID (pour la page view)
	 */
	const getPublicRankingById = async (id: string): Promise<UserRankingWithItems | null> => {
		const { data: ranking, error: rankingError } = await supabase
			.from('user_rankings')
			.select('*, user:users(id, name, photo_url)')
			.eq('id', id)
			.eq('is_public', true)
			.single()

		if (rankingError) {
			console.error('Erreur lors de la récupération du ranking:', rankingError)
			return null
		}

		// Récupérer les items avec les infos des musiques
		const { data: items, error: itemsError } = await supabase
			.from('user_ranking_items')
			.select(`
				*,
				music:musics(
					*,
					artists:music_artists(
						artist:artists(id, name, image)
					)
				)
			`)
			.eq('ranking_id', id)
			.order('position', { ascending: true })

		if (itemsError) {
			console.error('Erreur lors de la récupération des items:', itemsError)
			return null
		}

		// Transformer les données
		const transformedItems = (items || []).map((item: any) => ({
			...item,
			music: {
				...item.music,
				artists: item.music?.artists?.map((a: any) => a.artist).filter(Boolean) || [],
			},
		}))

		return {
			...(ranking as any),
			items: transformedItems,
			item_count: transformedItems.length,
		}
	}

	/**
	 * Récupère les rankings publics (pour la page explore)
	 */
	const getPublicRankings = async (
		page: number = 1,
		limit: number = 20
	): Promise<{ rankings: UserRankingWithPreview[]; total: number }> => {
		const offset = (page - 1) * limit

		const { data: rankings, error, count } = await supabase
			.from('user_rankings')
			.select('*, user:users(id, name, photo_url)', { count: 'exact' })
			.eq('is_public', true)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1)

		if (error) {
			console.error('Erreur lors de la récupération des rankings publics:', error)
			return { rankings: [], total: 0 }
		}

		// Pour chaque ranking, récupérer le nombre d'items et les 4 premières thumbnails
		const rankingsWithPreview: UserRankingWithPreview[] = await Promise.all(
			(rankings || []).map(async (ranking: any) => {
				const { data: items, count: itemCount } = await supabase
					.from('user_ranking_items')
					.select('music_id, musics(thumbnails)', { count: 'exact' })
					.eq('ranking_id', ranking.id)
					.order('position', { ascending: true })
					.limit(4)

				const thumbnails = (items || []).map((item: any) => {
					const music = item.musics
					if (music?.thumbnails && Array.isArray(music.thumbnails)) {
						return music.thumbnails[2]?.url || music.thumbnails[0]?.url || null
					}
					return null
				})

				return {
					...ranking,
					item_count: itemCount || 0,
					preview_thumbnails: thumbnails,
				}
			})
		)

		return {
			rankings: rankingsWithPreview,
			total: count || 0,
		}
	}

	return {
		getUserRankings,
		getRankingById,
		getPublicRankingById,
		createRanking,
		updateRanking,
		deleteRanking,
		addMusicToRanking,
		removeMusicFromRanking,
		reorderRankingItems,
		isMusicInRanking,
		getPublicRankings,
	}
}
