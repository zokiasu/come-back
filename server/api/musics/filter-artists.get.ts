import type { Tables } from '../../types/api'

type ArtistRow = Tables<'artists'>
type MusicFilterRow = {
	artist_id: string
	music: Pick<Tables<'musics'>, 'id' | 'name' | 'release_year' | 'ismv'> | null
}

const BATCH_SIZE = 1000
const ARTIST_ID_BATCH_SIZE = 200

const EXCLUDED_MUSIC_NAME_PATTERNS = [
	'%Inst.%',
	'%Instrumental%',
	'%Sped Up%',
	'%(live)%',
	'%[live]%',
	'% - Live%',
]

const hasExcludedMusicName = (name: string | null | undefined): boolean => {
	if (!name) return false

	const normalizedName = name.toLowerCase()
	return EXCLUDED_MUSIC_NAME_PATTERNS.some((pattern) =>
		normalizedName.includes(pattern.replaceAll('%', '').toLowerCase()),
	)
}

const sortArtists = (artists: ArtistRow[]) =>
	[...artists].sort((left, right) => left.name.localeCompare(right.name, 'fr-FR'))

export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()

	try {
		const query = getQuery(event)
		const search = validateSearchParam(query.search as string | undefined)
		const years = validateNumericArrayParam(query.years as string | undefined, 'years')
		const styles = validateArrayParam(query.styles as string | undefined, 'styles')
		const selectedArtistIds = validateArrayParam(
			query.selectedArtistIds as string | undefined,
			'selectedArtistIds',
		)
		const ismv = query.ismv === 'true' ? true : query.ismv === 'false' ? false : undefined

		let styleMatchedArtistIds: string[] | undefined

		if (styles && styles.length > 0) {
			const { data: styleMatchedArtists, error: styleMatchedArtistsError } =
				await supabase
					.from('artists')
					.select('id')
					.eq('verified', true)
					.eq('active_career', true)
					.overlaps('styles', styles)

			if (styleMatchedArtistsError) {
				throw styleMatchedArtistsError
			}

			styleMatchedArtistIds = (styleMatchedArtists || []).map((artist) => artist.id)

			if (styleMatchedArtistIds.length === 0) {
				const selectedArtists =
					selectedArtistIds && selectedArtistIds.length > 0
						? await supabase
								.from('artists')
								.select('*')
								.in('id', selectedArtistIds)
								.eq('verified', true)
								.eq('active_career', true)
						: { data: [], error: null }

				if (selectedArtists.error) {
					throw selectedArtists.error
				}

				return {
					artists: sortArtists(selectedArtists.data || []),
				}
			}
		}

		const isBroadArtistOnlyQuery =
			!search && ismv === undefined && (!years || years.length === 0)

		if (isBroadArtistOnlyQuery) {
			let artistsQuery = supabase
				.from('artists')
				.select('*')
				.eq('verified', true)
				.eq('active_career', true)

			if (styleMatchedArtistIds) {
				artistsQuery = artistsQuery.in('id', styleMatchedArtistIds)
			}

			const { data: artists, error: artistsError } = await artistsQuery

			if (artistsError) {
				throw artistsError
			}

			return {
				artists: sortArtists(artists || []),
			}
		}

		const buildArtistMusicQuery = (artistIdBatch?: string[]) => {
			let artistMusicQuery = supabase.from('music_artists').select(`
					artist_id,
					music:musics!inner(
						id,
						name,
						release_year,
						ismv
					)
				`)

			const activeArtistIds = artistIdBatch ?? styleMatchedArtistIds

			if (activeArtistIds !== undefined) {
				artistMusicQuery =
					activeArtistIds.length > 0
						? artistMusicQuery.in('artist_id', activeArtistIds)
						: artistMusicQuery.eq('artist_id', '00000000-0000-0000-0000-000000000000')
			}

			if (search) {
				artistMusicQuery = artistMusicQuery.ilike('music.name', `%${search}%`)
			}

			if (years && years.length > 0) {
				artistMusicQuery = artistMusicQuery.in('music.release_year', years)
			}

			if (ismv !== undefined) {
				artistMusicQuery = artistMusicQuery.eq('music.ismv', ismv)
			}

			return artistMusicQuery
		}

		const matchedArtistIds = new Set<string>()
		const musicArtistIdBatches =
			styleMatchedArtistIds && styleMatchedArtistIds.length > 0
				? Array.from(
						{ length: Math.ceil(styleMatchedArtistIds.length / ARTIST_ID_BATCH_SIZE) },
						(_, index) =>
							styleMatchedArtistIds.slice(
								index * ARTIST_ID_BATCH_SIZE,
								(index + 1) * ARTIST_ID_BATCH_SIZE,
							),
					)
				: [undefined]

		for (const artistIdBatch of musicArtistIdBatches) {
			let from = 0
			let hasMore = true

			while (hasMore) {
				const { data, error: artistMusicError } = await buildArtistMusicQuery(
					artistIdBatch,
				).range(from, from + BATCH_SIZE - 1)

				if (artistMusicError) {
					throw artistMusicError
				}

				const batch = (data || []) as MusicFilterRow[]
				for (const row of batch) {
					if (!row.music) continue
					if (hasExcludedMusicName(row.music.name)) continue
					matchedArtistIds.add(row.artist_id)
				}

				hasMore = batch.length === BATCH_SIZE
				from += BATCH_SIZE
			}
		}

		if (selectedArtistIds && selectedArtistIds.length > 0) {
			for (const artistId of selectedArtistIds) {
				matchedArtistIds.add(artistId)
			}
		}

		if (matchedArtistIds.size === 0) {
			return {
				artists: [],
			}
		}

		const matchedArtistIdList = [...matchedArtistIds]
		const artistIdBatches = Array.from(
			{ length: Math.ceil(matchedArtistIdList.length / ARTIST_ID_BATCH_SIZE) },
			(_, index) =>
				matchedArtistIdList.slice(
					index * ARTIST_ID_BATCH_SIZE,
					(index + 1) * ARTIST_ID_BATCH_SIZE,
				),
		)
		const artists: ArtistRow[] = []

		for (const artistIdBatch of artistIdBatches) {
			const { data: batchArtists, error: artistsError } = await supabase
				.from('artists')
				.select('*')
				.in('id', artistIdBatch)
				.eq('verified', true)
				.eq('active_career', true)

			if (artistsError) {
				throw artistsError
			}

			artists.push(...(batchArtists || []))
		}

		return {
			artists: sortArtists(artists),
		}
	} catch (error) {
		console.error('Error fetching filtered artists for musics:', error)

		if (isPostgrestError(error)) {
			throw handleSupabaseError(error, 'musics.filter-artists')
		}

		throw createInternalError('Failed to fetch filtered artists', error)
	}
})
