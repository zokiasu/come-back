import type { SupabaseClient } from '@supabase/supabase-js'
import type {
	Music,
	PublicRankingUser,
	UserRanking,
	UserRankingWithItems,
	UserRankingWithPreview,
} from '~/types'
import type { Database, Json, Tables } from '~/types/supabase'

type RankingRow = Tables<'user_rankings'> & {
	user?: PublicRankingUser | null
}

type PreviewItemRow = {
	musics: { thumbnails: Json | null } | null
}

type MusicWithArtistJunctions = Tables<'musics'> & {
	artists: Array<{
		artist: Tables<'artists'> | null
	}>
}

type RankingItemRow = Tables<'user_ranking_items'> & {
	music: MusicWithArtistJunctions | null
}

const normalizeRanking = (ranking: RankingRow): UserRanking => ({
	id: ranking.id,
	user_id: ranking.user_id,
	name: ranking.name,
	description: ranking.description,
	is_public: ranking.is_public ?? false,
	created_at: ranking.created_at,
	updated_at: ranking.updated_at,
})

const getThumbnailUrl = (thumbnails: Json | null): string | null => {
	if (!Array.isArray(thumbnails)) return null

	for (const index of [2, 0]) {
		const candidate = thumbnails[index]
		if (
			typeof candidate === 'object' &&
			candidate !== null &&
			!Array.isArray(candidate) &&
			typeof candidate.url === 'string'
		) {
			return candidate.url
		}
	}

	return null
}

export const buildRankingPreviews = async (
	supabase: SupabaseClient<Database>,
	rankings: RankingRow[],
): Promise<UserRankingWithPreview[]> => {
	return Promise.all(
		rankings.map(async (ranking) => {
			const { data, count, error } = await supabase
				.from('user_ranking_items')
				.select('musics!inner(thumbnails)', { count: 'exact' })
				.eq('ranking_id', ranking.id)
				.eq('musics.verified', true)
				.order('position', { ascending: true })
				.limit(4)

			if (error) throw handleSupabaseError(error, 'rankings.preview')

			return {
				...normalizeRanking(ranking),
				...(ranking.user ? { user: ranking.user } : {}),
				item_count: count ?? 0,
				preview_thumbnails: ((data ?? []) as PreviewItemRow[]).map((item) =>
					getThumbnailUrl(item.musics?.thumbnails ?? null),
				),
			}
		}),
	)
}

export const fetchRankingWithItems = async (
	supabase: SupabaseClient<Database>,
	ranking: RankingRow,
): Promise<UserRankingWithItems> => {
	const { data, error } = await supabase
		.from('user_ranking_items')
		.select(
			`*, music:musics!inner(*, artists:music_artists!inner(artist:artists!inner(*)))`,
		)
		.eq('ranking_id', ranking.id)
		.eq('music.verified', true)
		.eq('music.artists.artist.verified', true)
		.order('position', { ascending: true })

	if (error) throw handleSupabaseError(error, 'rankings.items')

	const items = ((data ?? []) as RankingItemRow[])
		.filter((item): item is RankingItemRow & { music: MusicWithArtistJunctions } =>
			Boolean(item.music),
		)
		.map((item) => ({
			id: item.id,
			ranking_id: item.ranking_id,
			music_id: item.music_id,
			position: item.position,
			added_at: item.added_at,
			music: {
				...item.music,
				artists: item.music.artists
					.map((junction) => junction.artist)
					.filter((artist): artist is Tables<'artists'> => Boolean(artist)),
			} satisfies Music,
		}))

	return {
		...normalizeRanking(ranking),
		...(ranking.user ? { user: ranking.user } : {}),
		items,
		item_count: items.length,
	}
}

export const requireOwnedRanking = async (
	supabase: SupabaseClient<Database>,
	rankingId: string,
	userId: string,
): Promise<Tables<'user_rankings'>> => {
	const { data, error } = await supabase
		.from('user_rankings')
		.select('*')
		.eq('id', rankingId)
		.eq('user_id', userId)
		.maybeSingle()

	if (error) throw handleSupabaseError(error, 'rankings.owner')
	if (!data) throw createNotFoundError('Ranking', rankingId)

	return data
}
