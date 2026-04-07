import type { Tables } from '#server/types/api'
import type { PostgrestError } from '@supabase/supabase-js'
import { isError as isH3Error } from 'h3'

export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()

	const releaseId = getRouterParam(event, 'id')
	if (!releaseId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Release ID is required',
		})
	}

	try {
		// 1. Fetch the release of base
		const { data: release, error: releaseError } = await supabase
			.from('releases')
			.select('*')
			.eq('id', releaseId)
			.single()

		if (releaseError || !release) {
			console.error('Error fetching release:', releaseError)
			throw createError({
				statusCode: 404,
				statusMessage: 'Release not found',
			})
		}

		// 2. Fetch related artists
		const { data: finalReleaseArtists, error: artistsError } = await supabase
			.from('artist_releases')
			.select('artist:artists(*)')
			.eq('release_id', releaseId)
			.eq('artist.verified', true)
		if (artistsError) throw artistsError

		// 3. Fetch related musics
		const { data: finalReleaseMusics, error: musicsError } = await supabase
			.from('music_releases')
			.select('music:musics(*)')
			.eq('release_id', releaseId)
		if (musicsError) throw musicsError

		// Fetch suggested releases from the same artist, excluding the current release
		const artistIds = transformJunction(finalReleaseArtists, 'artist').map(
			(artist) => artist.id,
		)
		const suggestedReleases: Array<
			Tables<'releases'> & { artists: Tables<'artists'>[] }
		> = []

		if (artistIds.length > 0) {
			// Fetch suggested release IDs first to keep the query simpler
			const { data: suggestedIds } = await supabase
				.from('artist_releases')
				.select('release_id')
				.in('artist_id', artistIds)
				.neq('release_id', releaseId)
				.limit(6)

			if (suggestedIds && suggestedIds.length > 0) {
				const releaseIds = suggestedIds.map((item) => item.release_id)

				// Fetch full data for suggested releases and their artists in 2 queries instead of N+1
				const [releasesResult, artistsResult] = await Promise.all([
					supabase
						.from('releases')
						.select('*')
						.in('id', releaseIds)
						.order('date', { ascending: false }),
					supabase
						.from('artist_releases')
						.select('release_id, artist:artists(*)')
						.in('release_id', releaseIds)
						.eq('artist.verified', true),
				])

				// Create a map to group artists by release_id
				const artistsByReleaseId = new Map<string, Tables<'artists'>[]>()
				for (const item of artistsResult.data || []) {
					if (!artistsByReleaseId.has(item.release_id)) {
						artistsByReleaseId.set(item.release_id, [])
					}
					artistsByReleaseId.get(item.release_id)!.push(item.artist as Tables<'artists'>)
				}

				// Assemble releases with their artists
				for (const release of releasesResult.data || []) {
					suggestedReleases.push({
						...release,
						artists: artistsByReleaseId.get(release.id) || [],
					})
				}
			}
		}

		// Transform the data to match the expected format
		const transformedRelease = {
			...release,
			artists: transformJunction(finalReleaseArtists, 'artist'),
			musics: transformJunction(finalReleaseMusics, 'music'),
		}

		return {
			release: transformedRelease,
			suggested_releases: suggestedReleases,
		}
	} catch (error) {
		// Preserve H3Errors (like 404) instead of remapping them
		if (isH3Error(error)) {
			throw error
		}
		console.error('Error fetching complete release:', error)
		throw handleSupabaseError(error as PostgrestError, 'releases.complete')
	}
})
