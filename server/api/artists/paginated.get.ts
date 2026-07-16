import type { Database } from '~/types/supabase'
import type { Artist } from '~/types'
import { checkRateLimit, RATE_LIMIT_PRESETS } from '../../utils/rateLimit'

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
 *
 * All filters — including the relation-presence ones (onlyWithoutSocials /
 * onlyWithoutPlatforms, which require a NOT EXISTS over junction tables) — are
 * applied inside the `get_paginated_artists` SQL function, so `total` and
 * `totalPages` always match what the page actually contains. The RPC returns
 * the ordered page of ids + the full filtered count; we then hydrate those ids
 * with their relations in a second query and restore the RPC order.
 */
export default defineEventHandler(async (event) => {
	checkRateLimit(event, RATE_LIMIT_PRESETS.paginated)

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

		// PostgREST wildcards were stripped client-side; the RPC does plain ILIKE.
		const normalizedSearch = search ? search.replaceAll('*', '') : ''

		const verifiedMode =
			verified === undefined
				? 'all'
				: verified === true
					? 'verified'
					: verified === null
						? 'unverified'
						: 'false_only'

		const activeMode =
			isActive === true ? 'active' : isActive === false ? 'inactive' : 'any'

		// 1) Resolve the ordered page of ids + the full filtered count in SQL.
		const { data: pageRows, error: pageError } = await supabase.rpc(
			'get_paginated_artists',
			{
				p_search: normalizedSearch || undefined,
				p_type: type || undefined,
				p_gender: gender || undefined,
				p_general_tags: generalTags?.length ? generalTags : undefined,
				p_nationalities: nationalities?.length ? nationalities : undefined,
				p_styles: styles?.length ? styles : undefined,
				p_active_mode: activeMode,
				p_only_without_desc: onlyWithoutDesc,
				p_only_without_styles: onlyWithoutStyles,
				p_only_with_styles: onlyWithStyles,
				p_only_without_socials: onlyWithoutSocials,
				p_only_without_platforms: onlyWithoutPlatforms,
				p_verified_mode: verifiedMode,
				p_skip_ytm: skipYoutubeMusicFilter,
				p_order_by: orderBy,
				p_order_dir: orderDirection,
				p_limit: limit,
				p_offset: offset,
			},
		)

		if (pageError) throw pageError

		const rows = pageRows ?? []
		const total = Number(rows[0]?.total_count ?? 0)
		const ids = rows.map((r) => r.id)

		if (ids.length === 0) {
			return { artists: [], total, page, limit, totalPages: Math.ceil(total / limit) }
		}

		// 2) Hydrate the page ids with their relations.
		const { data, error } = await supabase
			.from('artists')
			.select(
				`
					*,
					social_links:artist_social_links(*),
					platform_links:artist_platform_links(*),
					companies:artist_companies(*, company:companies(*)),
					groups:artist_relations!artist_relations_member_id_fkey(
						group:artists!artist_relations_group_id_fkey(id, name, image)
					)
				`,
			)
			.in('id', ids)

		if (error) throw error

		type RawGroup = { group?: Pick<Artist, 'id' | 'name' | 'image'> | null }
		type RawArtist = Omit<Artist, 'groups' | 'social_links' | 'platform_links'> & {
			social_links?: unknown[]
			platform_links?: unknown[]
			companies?: unknown[]
			groups?: RawGroup[]
		}

		// Restore the RPC order (the `.in()` fetch does not preserve it).
		const orderIndex = new Map(ids.map((id, index) => [id, index]))
		const transformed = (data as RawArtist[])
			.map((artist) => ({
				...artist,
				social_links: artist.social_links || [],
				platform_links: artist.platform_links || [],
				companies: artist.companies || [],
				groups: (artist.groups || []).map((g) => g.group).filter(Boolean),
			}))
			.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0))

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
