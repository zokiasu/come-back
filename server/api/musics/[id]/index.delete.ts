import { isError as isH3Error } from 'h3'

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const musicId = validateRouteParam(event, 'id', 'Music')

	const supabase = useServerSupabase()

	try {
		// Supprimer les relations music_artists
		await supabase.from('music_artists').delete().eq('music_id', musicId)

		// Supprimer les relations music_releases
		await supabase.from('music_releases').delete().eq('music_id', musicId)

		// Supprimer la musique
		const { error } = await supabase.from('musics').delete().eq('id', musicId)

		if (error) throw handleSupabaseError(error, 'musics.delete')

		return { success: true }
	} catch (error) {
		if (isH3Error(error)) throw error
		throw createInternalError('Failed to delete music', error)
	}
})
