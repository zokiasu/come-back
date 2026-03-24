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

	// 1. Créer la release
	const { data: release, error: releaseError } = await supabase
		.from('releases')
		.insert(body.release)
		.select()
		.single()

	if (releaseError) throw handleSupabaseError(releaseError, 'releases.create')

	// 2. Lier les artistes
	const { error: artistError } = await supabase.from('artist_releases').insert(
		body.artistIds.map((artistId, index) => ({
			release_id: release.id,
			artist_id: artistId,
			is_primary: index === 0,
		})),
	)

	if (artistError) {
		// Rollback : supprimer la release créée
		await supabase.from('releases').delete().eq('id', release.id)
		throw handleSupabaseError(artistError, 'releases.create.artists')
	}

	// 3. Ajouter les liens de plateformes
	if (body.platformLinks?.length) {
		const { error: platformError } = await supabase
			.from('release_platform_links')
			.insert(body.platformLinks.map((link) => ({ ...link, release_id: release.id })))

		if (platformError) {
			console.error('Error adding platform links:', platformError)
			// Non-fatal, on continue
		}
	}

	return release
})
