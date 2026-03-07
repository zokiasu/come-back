import type { Tables } from '../../types/api'

type ArtistRow = Tables<'artists'>
type MusicArtistRow = {
	music_id: string
	artist: ArtistRow | null
	music: Pick<Tables<'musics'>, 'id' | 'name' | 'release_year' | 'ismv'> | null
}

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

		let musicIdsToFilter: string[] | undefined

		if (styles && styles.length > 0) {
			const { data: styleMusicIds, error: styleMusicIdsError } = await supabase.rpc(
				'get_music_ids_by_styles',
				{
					style_filters: styles,
				},
			)

			if (styleMusicIdsError) {
				throw styleMusicIdsError
			}

			musicIdsToFilter = [
				...new Set((styleMusicIds || []).map((item: { music_id: string }) => item.music_id)),
			]
		}

		let artistMusicQuery = supabase.from('music_artists').select(`
				music_id,
				artist:artists!inner(*),
				music:musics!inner(
					id,
					name,
					release_year,
					ismv
				)
			`)

		artistMusicQuery = artistMusicQuery
			.eq('artist.verified', true)
			.eq('artist.active_career', true)

		if (musicIdsToFilter !== undefined) {
			artistMusicQuery =
				musicIdsToFilter.length > 0
					? artistMusicQuery.in('music_id', musicIdsToFilter)
					: artistMusicQuery.eq('music_id', '00000000-0000-0000-0000-000000000000')
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

		const { data: artistMusicRows, error: artistMusicError } =
			await artistMusicQuery

		if (artistMusicError) {
			throw artistMusicError
		}

		const artistsMap = new Map<string, ArtistRow>()

		for (const row of (artistMusicRows || []) as MusicArtistRow[]) {
			if (!row.artist || !row.music) continue
			if (hasExcludedMusicName(row.music.name)) continue
			artistsMap.set(row.artist.id, row.artist)
		}

		if (selectedArtistIds && selectedArtistIds.length > 0) {
			const { data: selectedArtists, error: selectedArtistsError } = await supabase
				.from('artists')
				.select('*')
				.in('id', selectedArtistIds)
				.eq('verified', true)
				.eq('active_career', true)

			if (selectedArtistsError) {
				throw selectedArtistsError
			}

			for (const artist of selectedArtists || []) {
				artistsMap.set(artist.id, artist)
			}
		}

		return {
			artists: [...artistsMap.values()].sort((left, right) =>
				left.name.localeCompare(right.name, 'fr-FR'),
			),
		}
	} catch (error) {
		console.error('Error fetching filtered artists for musics:', error)

		if (isPostgrestError(error)) {
			throw handleSupabaseError(error, 'musics.filter-artists')
		}

		throw createInternalError('Failed to fetch filtered artists', error)
	}
})
