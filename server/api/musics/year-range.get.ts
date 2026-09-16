import {
	applyMusicFilters,
	applyMusicNameExclusions,
	applyVerifiedArtistFilter,
} from '../../utils/queryFilters'
import { checkRateLimit, RATE_LIMIT_PRESETS } from '../../utils/rateLimit'

const YEAR_MIN = 1900
const YEAR_MAX = 2100

interface MusicYearRow {
	release_year: number | null
}

const sanitizeYear = (value: number | null | undefined): number | null => {
	if (typeof value !== 'number' || !Number.isInteger(value)) return null
	if (value < YEAR_MIN || value > YEAR_MAX) return null
	return value
}

export default defineEventHandler(async (event) => {
	await checkRateLimit(event, RATE_LIMIT_PRESETS.paginated)
	setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=300')

	const supabase = useServerSupabase()

	// Mirror the public explorer scope: verified tracks from verified artists,
	// excluding instrumental/live variants.
	const buildYearQuery = () => {
		let query = supabase
			.from('musics')
			.select('release_year, artists:music_artists!inner(artist:artists!inner())')

		query = applyVerifiedArtistFilter(query)
		query = applyMusicFilters(query, { verified: true })
		query = applyMusicNameExclusions(query)

		return query.not('release_year', 'is', null)
	}

	const [oldestResult, newestResult] = await Promise.all([
		buildYearQuery().order('release_year', { ascending: true }).limit(1).maybeSingle(),
		buildYearQuery().order('release_year', { ascending: false }).limit(1).maybeSingle(),
	])

	if (oldestResult.error) {
		throw handleSupabaseError(oldestResult.error, 'musics.year-range')
	}
	if (newestResult.error) {
		throw handleSupabaseError(newestResult.error, 'musics.year-range')
	}

	return {
		minYear: sanitizeYear((oldestResult.data as MusicYearRow | null)?.release_year),
		maxYear: sanitizeYear((newestResult.data as MusicYearRow | null)?.release_year),
	}
})
