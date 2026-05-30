import type { Database } from '~/types/supabase'
import type { Artist } from '~/types'

type ArtistGender = Database['public']['Enums']['gender']
type ArtistType = Database['public']['Enums']['artist_type']

const ALLOWED_ORDER_COLUMNS = [
	'name',
	'type',
	'created_at',
	'updated_at',
	'verified',
	'debut_date',
] as const

const asBool = (value: unknown): boolean => value === 'true' || value === true

/**
 * Server-side artist pagination. Mirrors the previous client-side
 * `fetchArtistsByPage` helper so the catalog and dashboard listings share a
 * single, RLS-bypassing source of truth (consistent with the other paginated
 * endpoints). Listing non-verified artists requires contributor rights.
 */
export default defineEventHandler(async (event) => {
	// This endpoint is auth-gated for non-public listings and returns
	// per-request results; never let it sit in a shared/CDN cache (overrides the
	// global /api s-maxage rule).
	setHeader(event, 'Cache-Control', 'no-store')

	const query = getQuery(event)

	// Tri-state verified: 'true' (public) | 'false' | 'null' | absent.
	const verifiedRaw = query.verified as string | undefined
	const verified: boolean | null | undefined =
		verifiedRaw === 'true'
			? true
			: verifiedRaw === 'false'
				? false
				: verifiedRaw === 'null'
					? null
					: undefined

	// Only verified artists are public; anything else is contributor-only.
	if (verified !== true) {
		await requireContributor(event)
	}

	const supabase = useServerSupabase()

	try {
		const page = validatePageParam(Number(query.page))
		const limit = validateLimitParam(Number(query.limit), 20)
		const search = validateSearchParam(query.search as string | undefined)
		const orderBy = validateOrderBy(query.orderBy as string, ALLOWED_ORDER_COLUMNS, 'name')
		const orderDirection = validateOrderDirection(query.orderDirection as string, 'asc')
		const generalTags = validateArrayParam(query.general_tags as string, 'general_tags')
		const nationalities = validateArrayParam(query.nationalities as string, 'nationalities')
		const styles = validateArrayParam(query.styles as string, 'styles')
		const type = query.type as ArtistType | undefined
		const gender = query.gender as string | undefined

		// Tri-state active career: 'true' | 'false' | absent.
		const isActiveRaw = query.isActive as string | undefined
		const isActive =
			isActiveRaw === 'true' ? true : isActiveRaw === 'false' ? false : undefined

		const onlyWithoutDesc = asBool(query.onlyWithoutDesc)
		const onlyWithoutSocials = asBool(query.onlyWithoutSocials)
		const onlyWithoutPlatforms = asBool(query.onlyWithoutPlatforms)
		const onlyWithoutStyles = asBool(query.onlyWithoutStyles)
		const onlyWithStyles = asBool(query.onlyWithStyles)
		const skipYoutubeMusicFilter = asBool(query.skipYoutubeMusicFilter)

		const offset = (page - 1) * limit

		let dataQuery = supabase.from('artists').select(
			`
				*,
				social_links:artist_social_links(*),
				platform_links:artist_platform_links(*),
				companies:artist_companies(*, company:companies(*)),
				groups:artist_relations!artist_relations_member_id_fkey(
					group:artists!artist_relations_group_id_fkey(id, name, image)
				)
			`,
			{ count: 'exact' },
		)

		if (search) {
			const normalizedSearch = search.replaceAll('*', '')
			dataQuery = dataQuery.or(
				`name.ilike.*${normalizedSearch}*,description.ilike.*${normalizedSearch}*`,
			)
		}

		if (type) {
			dataQuery = dataQuery.eq('type', type)
		}

		if (gender) {
			dataQuery = dataQuery.eq('gender', gender as ArtistGender)
		}

		if (generalTags?.length) {
			dataQuery = dataQuery.overlaps('general_tags', generalTags)
		}

		if (nationalities?.length) {
			dataQuery = dataQuery.overlaps('nationalities', nationalities)
		}

		if (styles?.length) {
			dataQuery = dataQuery.overlaps('styles', styles)
		}

		if (isActive === true) {
			dataQuery = dataQuery.eq('active_career', true)
		} else if (isActive === false) {
			dataQuery = dataQuery.or('active_career.is.false,active_career.is.null')
		}

		if (onlyWithoutDesc) {
			dataQuery = dataQuery.or('description.is.null,description.eq.')
		}

		if (onlyWithoutStyles) {
			dataQuery = dataQuery.or('styles.is.null,styles.eq.{}')
		}

		if (onlyWithStyles) {
			dataQuery = dataQuery.not('styles', 'is', null).not('styles', 'eq', '{}')
		}

		if (verified !== undefined) {
			if (verified === null) {
				dataQuery = dataQuery.or('verified.is.null,verified.eq.false')
			} else {
				dataQuery = dataQuery.eq('verified', verified)
			}
		}

		if (!skipYoutubeMusicFilter) {
			dataQuery = dataQuery.not('id_youtube_music', 'is', null)
		}

		dataQuery = dataQuery.order(orderBy, { ascending: orderDirection === 'asc' })
		dataQuery = dataQuery.range(offset, offset + limit - 1)

		const { data, error, count } = await dataQuery

		if (error) throw error

		type RawGroup = { group?: Pick<Artist, 'id' | 'name' | 'image'> | null }
		type RawArtist = Omit<Artist, 'groups' | 'social_links' | 'platform_links'> & {
			social_links?: unknown[]
			platform_links?: unknown[]
			companies?: unknown[]
			groups?: RawGroup[]
		}

		let transformed = (data as RawArtist[]).map((artist) => ({
			...artist,
			social_links: artist.social_links || [],
			platform_links: artist.platform_links || [],
			companies: artist.companies || [],
			groups: (artist.groups || []).map((g) => g.group).filter(Boolean),
		}))

		// Relation-presence filters are applied to the fetched page (parity with
		// the previous client-side helper).
		if (onlyWithoutSocials) {
			transformed = transformed.filter((a) => !a.social_links || a.social_links.length === 0)
		}
		if (onlyWithoutPlatforms) {
			transformed = transformed.filter(
				(a) => !a.platform_links || a.platform_links.length === 0,
			)
		}

		const total = count || 0

		return {
			artists: transformed as Artist[],
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	} catch (error) {
		console.error('Error fetching paginated artists:', error)
		if (isPostgrestError(error)) {
			throw handleSupabaseError(error, 'artists.paginated')
		}
		throw createInternalError('Failed to fetch paginated artists', error)
	}
})
