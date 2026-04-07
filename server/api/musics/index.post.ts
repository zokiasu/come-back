import type { TablesInsert } from '~/types/supabase'

interface CreateMusicBody {
	music: TablesInsert<'musics'>
	artistIds: string[]
}

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const body = await readBody<CreateMusicBody>(event)

	if (!body?.music) {
		throw createBadRequestError('Music data is required')
	}

	const supabase = useServerSupabase()

	// 1. Create the music
	const { data: music, error: musicError } = await supabase
		.from('musics')
		.insert(body.music)
		.select()
		.single()

	if (musicError) throw handleSupabaseError(musicError, 'musics.create')

	// 2. Link the artists
	if (body.artistIds?.length) {
		const { error: artistError } = await supabase.from('music_artists').insert(
			body.artistIds.map((artistId, index) => ({
				music_id: music.id,
				artist_id: artistId,
				is_primary: index === 0,
			})),
		)

		if (artistError) {
			// Rollback
			await supabase.from('musics').delete().eq('id', music.id)
			throw handleSupabaseError(artistError, 'musics.create.artists')
		}
	}

	return music
})
