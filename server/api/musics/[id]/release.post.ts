interface AddToReleaseBody {
	releaseId: string
	trackNumber: number
}

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const musicId = validateRouteParam(event, 'id', 'Music')
	const body = await readBody<AddToReleaseBody>(event)

	if (!body?.releaseId) {
		throw createBadRequestError('Release ID is required')
	}

	if (body.trackNumber === undefined || body.trackNumber === null) {
		throw createBadRequestError('Track number is required')
	}

	const supabase = useServerSupabase()

	const { error } = await supabase.from('music_releases').insert({
		music_id: musicId,
		release_id: body.releaseId,
		track_number: body.trackNumber,
	})

	if (error) throw handleSupabaseError(error, 'music_releases.insert')

	return { success: true }
})
