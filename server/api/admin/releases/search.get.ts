import { requireAdmin } from '../../../utils/auth'
import { useServerSupabase } from '../../../utils/supabase'
import {
	validateArrayParam,
	validateLimitParam,
	validateSearchParam,
} from '../../../utils/validation'

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const query = getQuery(event)
	const search = validateSearchParam(query.search as string | undefined)
	const limit = validateLimitParam(Number(query.limit), 8)
	const artistIds = validateArrayParam(query.artistIds as string | undefined, 'artistIds')

	if (!search || search.length < 2) {
		return { releases: [] }
	}

	const supabase = useServerSupabase()

	let releaseIds: string[] | null = null

	if (artistIds?.length) {
		const { data: artistReleaseRows, error: artistReleaseError } = await supabase
			.from('artist_releases')
			.select('release_id')
			.in('artist_id', artistIds)

		if (artistReleaseError) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Failed to search releases',
				message: artistReleaseError.message,
			})
		}

		releaseIds = Array.from(
			new Set(
				(artistReleaseRows || [])
					.map((row) => row.release_id)
					.filter((value): value is string => Boolean(value)),
			),
		)

		if (releaseIds.length === 0) {
			return { releases: [] }
		}
	}

	let releaseQuery = supabase
		.from('releases')
		.select(`
			id,
			name,
			image,
			date,
			artists:artist_releases(
				artist:artists(id, name, image, verified)
			)
		`)
		.ilike('name', `%${search}%`)
		.order('date', { ascending: false })
		.limit(limit)

	if (releaseIds?.length) {
		releaseQuery = releaseQuery.in('id', releaseIds)
	}

	const { data, error } = await releaseQuery

	if (error) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to search releases',
			message: error.message,
		})
	}

	return {
		releases: (data || []).map((release) => ({
			...release,
			artists:
				release.artists
					?.map((item) => item.artist)
					.filter(
						(
							artist,
						): artist is { id: string; name: string; image: string | null; verified: boolean } =>
							Boolean(artist) && artist.verified,
					) || [],
		})),
	}
})
