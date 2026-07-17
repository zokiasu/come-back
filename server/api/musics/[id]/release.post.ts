import { validateBody } from '../../../utils/validation'
import { addToReleaseBodySchema } from '../../../utils/schemas'

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const musicId = validateRouteParam(event, 'id', 'Music')
	const body = validateBody(await readBody(event), addToReleaseBodySchema)

	const supabase = useServerSupabase()

	const { error } = await supabase.from('music_releases').insert({
		music_id: musicId,
		release_id: body.releaseId,
		track_number: body.trackNumber,
	})

	if (error) throw handleSupabaseError(error, 'music_releases.insert')

	return { success: true }
})
