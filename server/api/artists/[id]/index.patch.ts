import type { TablesInsert, TablesUpdate } from '~/types/supabase'

interface UpdateArtistBody {
	updates: TablesUpdate<'artists'>
	socialLinks?: Omit<TablesInsert<'artist_social_links'>, 'artist_id'>[]
	platformLinks?: Omit<TablesInsert<'artist_platform_links'>, 'artist_id'>[]
	groupIds?: string[]
	memberIds?: string[]
	companies?: Omit<TablesInsert<'artist_companies'>, 'artist_id'>[]
}

export default defineEventHandler(async (event) => {
	await requireContributor(event)

	const artistId = validateRouteParam(event, 'id', 'Artist')
	const body = await readBody<UpdateArtistBody>(event)

	if (!body) {
		throw createBadRequestError('Request body is required')
	}

	const supabase = useServerSupabase()

	// Vérifier conflit YouTube Music ID
	if (body.updates?.id_youtube_music) {
		const { data: conflict } = await supabase
			.from('artists')
			.select('id, name')
			.eq('id_youtube_music', body.updates.id_youtube_music)
			.neq('id', artistId)
			.maybeSingle()

		if (conflict) {
			throw createError({
				statusCode: 409,
				statusMessage: 'Conflict',
				message: `This YouTube Music ID is already linked to ${conflict.name}`,
			})
		}
	}

	// 1. Mettre à jour l'artiste
	let updatedArtist = null
	if (body.updates && Object.keys(body.updates).length > 0) {
		const { data, error } = await supabase
			.from('artists')
			.update(body.updates)
			.eq('id', artistId)
			.select()
			.single()

		if (error) throw handleSupabaseError(error, 'artists.update')
		updatedArtist = data
	}

	// 2. Mettre à jour les liens sociaux si fournis
	if (body.socialLinks !== undefined) {
		await supabase.from('artist_social_links').delete().eq('artist_id', artistId)

		if (body.socialLinks.length > 0) {
			const { error } = await supabase
				.from('artist_social_links')
				.insert(body.socialLinks.map((l) => ({ ...l, artist_id: artistId })))

			if (error) console.error('Error updating social links:', error)
		}
	}

	// 3. Mettre à jour les liens plateformes si fournis
	if (body.platformLinks !== undefined) {
		await supabase.from('artist_platform_links').delete().eq('artist_id', artistId)

		if (body.platformLinks.length > 0) {
			const { error } = await supabase
				.from('artist_platform_links')
				.insert(body.platformLinks.map((l) => ({ ...l, artist_id: artistId })))

			if (error) console.error('Error updating platform links:', error)
		}
	}

	// 4. Mettre à jour les relations artiste si groupIds/memberIds fournis
	if (body.groupIds !== undefined || body.memberIds !== undefined) {
		// Supprimer toutes les relations existantes
		await supabase
			.from('artist_relations')
			.delete()
			.or(`group_id.eq.${artistId},member_id.eq.${artistId}`)

		// Re-insérer les groupes
		if (body.groupIds?.length) {
			const { error } = await supabase.from('artist_relations').insert(
				body.groupIds.map((groupId) => ({
					group_id: groupId,
					member_id: artistId,
					relation_type: 'MEMBER' as const,
				})),
			)

			if (error) console.error('Error updating group relations:', error)
		}

		// Re-insérer les membres
		if (body.memberIds?.length) {
			const { error } = await supabase.from('artist_relations').insert(
				body.memberIds.map((memberId) => ({
					group_id: artistId,
					member_id: memberId,
					relation_type: 'GROUP' as const,
				})),
			)

			if (error) console.error('Error updating member relations:', error)
		}
	}

	// 5. Mettre à jour les companies si fournis
	if (body.companies !== undefined) {
		await supabase.from('artist_companies').delete().eq('artist_id', artistId)

		if (body.companies.length > 0) {
			const { error } = await supabase
				.from('artist_companies')
				.insert(body.companies.map((c) => ({ ...c, artist_id: artistId })))

			if (error) console.error('Error updating company relations:', error)
		}
	}

	return updatedArtist ?? { id: artistId }
})
