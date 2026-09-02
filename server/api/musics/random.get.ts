import type { PostgrestError } from '@supabase/supabase-js'
import { isError as isH3Error } from 'h3'
import { validateIntegerParam } from '../../utils/validation'

const OVERSAMPLE_FACTOR = 3
const MAX_SAMPLE_SIZE = 60
const CACHED_RESPONSE_CONTROL =
	'public, max-age=60, s-maxage=300, stale-while-revalidate=300'

const parseFreshParam = (value: unknown): boolean => {
	if (value === undefined || value === 'false') return false
	if (value === 'true') return true

	throw createError({
		statusCode: 400,
		statusMessage: 'Bad Request',
		message: "Parameter 'fresh' must be a boolean",
	})
}

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const limit = validateIntegerParam(query.limit, 'limit', {
		min: 1,
		max: 20,
		defaultValue: 4,
	})
	const isFresh = parseFreshParam(query.fresh)

	const supabase = useServerSupabase()
	const sampleSize = Math.min(limit * OVERSAMPLE_FACTOR, MAX_SAMPLE_SIZE)
	const sampleOrder = new Map<string, number>()

	try {
		const fetchCandidates = async () => {
			const { data: randomIds, error: rpcError } = await supabase.rpc(
				'get_random_discover_music_ids',
				{ count_param: sampleSize },
			)

			if (rpcError) {
				throw handleSupabaseError(rpcError, 'musics.random.rpc')
			}

			const musicIds: string[] = []
			const attemptIds = new Set<string>()
			for (const row of randomIds || []) {
				const id = row.id
				if (typeof id === 'string' && id.length > 0 && !attemptIds.has(id)) {
					musicIds.push(id)
					attemptIds.add(id)
				}
			}

			for (const id of musicIds) {
				sampleOrder.set(id, sampleOrder.size)
			}

			if (musicIds.length === 0) return []

			const { data, error } = await supabase
				.from('musics')
				.select(
					`
					id,
					name,
					id_youtube_music,
					duration,
					thumbnails,
					type,
					date,
					artists:music_artists!inner(
						artist:artists!inner(id, name, image)
					),
					releases:music_releases!inner(
						release:releases!inner(id, name)
					)
				`,
				)
				.in('id', musicIds)
				.not('id_youtube_music', 'is', null)
				.eq('verified', true)
				.eq('artists.artist.verified', true)
				.eq('releases.release.verified', true)
				.not('name', 'ilike', '%Inst.%')
				.not('name', 'ilike', '%Instrumental%')
				.not('name', 'ilike', '%Sped Up%')
				.not('name', 'ilike', '%(live)%')
				.not('name', 'ilike', '%[live]%')
				.not('name', 'ilike', '% - Live%')

			if (error) {
				throw handleSupabaseError(error, 'musics.random')
			}

			return data || []
		}

		const candidates = (await fetchCandidates())
			.sort(
				(left, right) =>
					(sampleOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
					(sampleOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER),
			)
			.map((music) => ({
				...music,
				artists: music.artists.map(({ artist }) => artist).filter(Boolean),
				releases: music.releases.map(({ release }) => release).filter(Boolean),
			}))

		const result: typeof candidates = []
		const usedArtistIds = new Set<string>()

		// First pass favors tracks whose artists are not represented yet.
		for (const music of candidates) {
			if (result.length >= limit) break
			const artistIds = music.artists.map((artist) => artist.id)
			if (artistIds.length > 0 && artistIds.some((id) => usedArtistIds.has(id))) {
				continue
			}

			result.push(music)
			for (const id of artistIds) usedArtistIds.add(id)
		}

		// If the catalog cannot provide enough distinct artists, fill the remainder.
		if (result.length < limit) {
			const selectedIds = new Set(result.map((music) => music.id))
			for (const music of candidates) {
				if (result.length >= limit) break
				if (!selectedIds.has(music.id)) {
					result.push(music)
					selectedIds.add(music.id)
				}
			}
		}

		setHeader(event, 'Cache-Control', isFresh ? 'no-store' : CACHED_RESPONSE_CONTROL)

		return result
	} catch (error) {
		// Never let an upstream/database failure inherit the public success cache policy.
		setHeader(event, 'Cache-Control', 'no-store')
		if (isH3Error(error)) {
			throw error
		}
		console.error('Error fetching random musics:', error)
		throw handleSupabaseError(error as PostgrestError, 'musics.random')
	}
})
