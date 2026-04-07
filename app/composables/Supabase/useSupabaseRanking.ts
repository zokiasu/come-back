/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
	UserRanking,
	UserRankingItem,
	UserRankingWithItems,
	UserRankingWithPreview,
} from '~/types'
import type { Database } from '~/types/supabase'

export function useSupabaseRanking() {
	const supabase = useSupabaseClient<Database>()
	const userStore = useUserStore()
	const toast = useToast()
	const { runMutation } = useMutationTimeout()

	const buildRankingPreviews = async (
		rankings: UserRanking[],
	): Promise<UserRankingWithPreview[]> => {
		return await Promise.all(
			rankings.map(async (ranking) => {
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
			}),
		)
	}

	/**
	 * Fetches all rankings for the authenticated user
	 */
	const getUserRankings = async (): Promise<UserRankingWithPreview[]> => {
		console.warn('[getUserRankings] Starting...', { userId: userStore.userDataStore?.id })

		if (!userStore.userDataStore?.id) {
			console.warn('[getUserRankings] No user ID, returning empty array')
			return []
		}

		const { data: rankings, error } = await supabase
			.from('user_rankings')
			.select('*')
			.eq('user_id', userStore.userDataStore.id)
			.order('updated_at', { ascending: false })

		console.warn('[getUserRankings] Query result:', { rankings, error })

		if (error) {
			console.error('Error while fetching rankings:', error)
			toast.add({
				title: 'Error',
				description: 'Unable to load your rankings',
				color: 'error',
			})
			return []
		}

		// For each ranking, fetch the item count and the first 4 thumbnails
		const rankingsWithPreview = await buildRankingPreviews(rankings as UserRanking[])

		return rankingsWithPreview
	}

	/**
	 * Fetches rankings for a given user
	 */
	const getRankingsByUserId = async (
		userId: string,
		options?: { publicOnly?: boolean },
	): Promise<UserRankingWithPreview[]> => {
		if (!userId) {
			return []
		}

		let query = supabase
			.from('user_rankings')
			.select('*')
			.eq('user_id', userId)
			.order('updated_at', { ascending: false })

		if (options?.publicOnly) {
			query = query.eq('is_public', true)
		}

		const { data: rankings, error } = await query

		if (error) {
			console.error('Error while fetching rankings by user:', error)
			toast.add({
				title: 'Error',
				description: 'Unable to load rankings for this profile',
				color: 'error',
			})
			return []
		}

		return await buildRankingPreviews((rankings || []) as UserRanking[])
	}

	/**
	 * Fetches a ranking by ID with all of its items
	 */
	const getRankingById = async (id: string): Promise<UserRankingWithItems | null> => {
		console.warn('[getRankingById] Starting...', { id })

		const { data: ranking, error: rankingError } = await supabase
			.from('user_rankings')
			.select('*')
			.eq('id', id)
			.single()

		console.warn('[getRankingById] Ranking result:', { ranking, rankingError })

		if (rankingError) {
			console.error('Error while fetching ranking:', rankingError)
			return null
		}

		// Fetch the items with the infos the musics
		const { data: items, error: itemsError } = await supabase
			.from('user_ranking_items')
			.select(
				`
				*,
				music:musics(
					*,
					artists:music_artists(
						artist:artists(id, name, image)
					)
				)
			`,
			)
			.eq('ranking_id', id)
			.order('position', { ascending: true })

		if (itemsError) {
			console.error('Error while fetching items:', itemsError)
			return null
		}

		// Transform the data
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
	 * Creates a new ranking
	 */
	const createRanking = async (
		name: string,
		description?: string,
	): Promise<UserRanking | null> => {
		console.warn('[createRanking] Starting...', {
			userId: userStore.userDataStore?.id,
			name,
		})

		if (!userStore.userDataStore?.id) {
			console.warn('[createRanking] No user ID')
			toast.add({
				title: 'Error',
				description: 'You must be signed in',
				color: 'error',
			})
			return null
		}

		const { data, error } = await runMutation(
			supabase
				.from('user_rankings')
				.insert({
					user_id: userStore.userDataStore.id,
					name,
					description: description || null,
					is_public: false,
				})
				.select()
				.single(),
			'Creating the ranking timed out. Please try again.',
		)

		console.warn('[createRanking] Result:', { data, error })

		if (error) {
			console.error('Error while creating ranking:', error)
			toast.add({
				title: 'Error',
				description: 'Unable to create ranking',
				color: 'error',
			})
			return null
		}

		toast.add({
			title: 'Success',
			description: 'Ranking created successfully',
			color: 'success',
		})

		return data as UserRanking
	}

	/**
	 * Updates a ranking
	 */
	const updateRanking = async (
		id: string,
		updates: Partial<Pick<UserRanking, 'name' | 'description' | 'is_public'>>,
	): Promise<UserRanking | null> => {
		const { data, error } = await runMutation(
			supabase.from('user_rankings').update(updates).eq('id', id).select().single(),
			'Updating the ranking timed out. Please try again.',
		)

		if (error) {
			console.error('Error while updating ranking:', error)
			toast.add({
				title: 'Error',
				description: 'Unable to update ranking',
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
		const { error } = await runMutation(
			supabase.from('user_rankings').delete().eq('id', id),
			'Deleting the ranking timed out. Please try again.',
		)

		if (error) {
			console.error('Error while deleting ranking:', error)
			toast.add({
				title: 'Error',
				description: 'Unable to delete ranking',
				color: 'error',
			})
			return false
		}

		toast.add({
			title: 'Success',
			description: 'Ranking deleted',
			color: 'success',
		})

		return true
	}

	/**
	 * Adds a track to the ranking
	 */
	const addMusicToRanking = async (
		rankingId: string,
		musicId: string,
	): Promise<UserRankingItem | null> => {
		// Fetch the position maximale actuelle
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
				title: 'Limit reached',
				description: 'A ranking cannot contain more than 100 tracks',
				color: 'warning',
			})
			return null
		}

		const { data, error } = await runMutation(
			supabase
				.from('user_ranking_items')
				.insert({
					ranking_id: rankingId,
					music_id: musicId,
					position: newPosition,
				})
				.select()
				.single(),
			'Adding the track to the ranking timed out. Please try again.',
		)

		if (error) {
			if (error.code === '23505') {
				// Duplicate key
				toast.add({
					title: 'Already added',
					description: 'This track is already in the ranking',
					color: 'warning',
				})
			} else {
				console.error('Error while adding track:', error)
				toast.add({
					title: 'Error',
					description: 'Unable to add the track',
					color: 'error',
				})
			}
			return null
		}

		// Update updated_at the ranking parent
		await runMutation(
			supabase
				.from('user_rankings')
				.update({ updated_at: new Date().toISOString() })
				.eq('id', rankingId),
			'Refreshing the ranking metadata timed out. Please try again.',
		)

		return data as UserRankingItem
	}

	/**
	 * Removes a track from the ranking
	 */
	const removeMusicFromRanking = async (
		rankingId: string,
		musicId: string,
	): Promise<boolean> => {
		// Fetch the position of the item to delete
		const { data: itemToDelete } = await supabase
			.from('user_ranking_items')
			.select('position')
			.eq('ranking_id', rankingId)
			.eq('music_id', musicId)
			.single()

		if (!itemToDelete) return false

		// Delete the item
		const { error } = await runMutation(
			supabase
				.from('user_ranking_items')
				.delete()
				.eq('ranking_id', rankingId)
				.eq('music_id', musicId),
			'Removing the track from the ranking timed out. Please try again.',
		)

		if (error) {
			console.error('Error while removing track:', error)
			toast.add({
				title: 'Error',
				description: 'Unable to remove the track',
				color: 'error',
			})
			return false
		}

		// Adjust the positions of the following items
		await runMutation(
			supabase.rpc('reorder_ranking_items_after_delete', {
				p_ranking_id: rankingId,
				p_deleted_position: itemToDelete.position,
			}),
			'Reordering the ranking timed out after deleting the track. Please try again.',
		)

		// Update updated_at the ranking parent
		await runMutation(
			supabase
				.from('user_rankings')
				.update({ updated_at: new Date().toISOString() })
				.eq('id', rankingId),
			'Refreshing the ranking metadata timed out. Please try again.',
		)

		return true
	}

	/**
	 * Reorders ranking items
	 */
	const reorderRankingItems = async (
		rankingId: string,
		items: { id: string; position: number }[],
	): Promise<boolean> => {
		try {
			// Use the atomic RPC function to avoid 409 conflicts
			const { error } = await runMutation(
				supabase.rpc('reorder_ranking_items_atomic', {
					p_ranking_id: rankingId,
					p_items: items,
				}),
				'Reordering the ranking timed out. Please try again.',
			)

			if (error) {
				throw error
			}

			return true
		} catch (error) {
			console.error('Error while reordering:', error)
			toast.add({
				title: 'Error',
				description: 'Unable to reorder tracks',
				color: 'error',
			})
			return false
		}
	}

	/**
	 * Checks whether a track is in a ranking
	 */
	const isMusicInRanking = async (
		rankingId: string,
		musicId: string,
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
	 * Fetches a public ranking by ID for the view page
	 */
	const getPublicRankingById = async (
		id: string,
	): Promise<UserRankingWithItems | null> => {
		const { data: ranking, error: rankingError } = await supabase
			.from('user_rankings')
			.select('*, user:users(id, name, photo_url)')
			.eq('id', id)
			.eq('is_public', true)
			.single()

		if (rankingError) {
			console.error('Error while fetching ranking:', rankingError)
			return null
		}

		// Fetch the items with the infos the musics
		const { data: items, error: itemsError } = await supabase
			.from('user_ranking_items')
			.select(
				`
				*,
				music:musics(
					*,
					artists:music_artists(
						artist:artists(id, name, image)
					)
				)
			`,
			)
			.eq('ranking_id', id)
			.order('position', { ascending: true })

		if (itemsError) {
			console.error('Error while fetching items:', itemsError)
			return null
		}

		// Transform the data
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
	 * Fetches public rankings for the explore page
	 */
	const getPublicRankings = async (
		page: number = 1,
		limit: number = 20,
	): Promise<{ rankings: UserRankingWithPreview[]; total: number }> => {
		const offset = (page - 1) * limit

		const {
			data: rankings,
			error,
			count,
		} = await supabase
			.from('user_rankings')
			.select('*, user:users(id, name, photo_url)', { count: 'exact' })
			.eq('is_public', true)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1)

		if (error) {
			console.error('Error while fetching public rankings:', error)
			return { rankings: [], total: 0 }
		}

		// For each ranking, fetch the item count and the first 4 thumbnails
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
			}),
		)

		return {
			rankings: rankingsWithPreview,
			total: count || 0,
		}
	}

	return {
		getUserRankings,
		getRankingsByUserId,
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
