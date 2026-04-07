import type { TablesInsert } from '~/types/supabase'

interface CreateReleaseBody {
	release: TablesInsert<'releases'>
	artistIds: string[]
	platformLinks?: Omit<TablesInsert<'release_platform_links'>, 'release_id'>[]
}

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const body = await readBody<CreateReleaseBody>(event)

	if (!body?.release) {
		throw createBadRequestError('Release data is required')
	}

	if (!body.artistIds?.length) {
		throw createBadRequestError('At least one artist is required')
	}

	const supabase = useServerSupabase()

	// 1. Create the release
	const { data: release, error: releaseError } = await supabase
		.from('releases')
		.insert(body.release)
		.select()
		.single()

	if (releaseError) throw handleSupabaseError(releaseError, 'releases.create')

	// 2. Link the artists
	const { error: artistError } = await supabase.from('artist_releases').insert(
		body.artistIds.map((artistId, index) => ({
			release_id: release.id,
			artist_id: artistId,
			is_primary: index === 0,
		})),
	)

	if (artistError) {
		// A release without its artist junctions is not usable in the app, so
		// roll back the parent row instead of returning a partial success.
		// Rollback: delete the newly created release
		await supabase.from('releases').delete().eq('id', release.id)
		throw handleSupabaseError(artistError, 'releases.create.artists')
	}

	// 3. Add the platform links
	if (body.platformLinks?.length) {
		const { error: platformError } = await supabase
			.from('release_platform_links')
			.insert(body.platformLinks.map((link) => ({ ...link, release_id: release.id })))

		if (platformError) {
			console.error('Error adding platform links:', platformError)
			// Non-fatal: keep the release even if platform links fail.
		}
	}

	// 4. Notify followers of related artists (non-fatal)
	// Fire-and-forget notifications so release creation does not wait on push delivery.
	notifyFollowersOfNewRelease(release.id, release.name, body.artistIds).catch((err) =>
		console.error('Error notifying followers:', err),
	)

	return release
})
