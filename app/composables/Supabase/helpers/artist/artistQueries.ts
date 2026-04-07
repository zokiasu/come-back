import type { Database } from '~/types/supabase'
import type { Artist, ArtistType, QueryOptions, FilterOptions } from '~/types'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseClientType = SupabaseClient<Database>
type ArtistGender = Database['public']['Enums']['gender']

export interface ArtistPageOptions {
	search?: string
	type?: ArtistType
	orderBy?: keyof Artist
	orderDirection?: 'asc' | 'desc'
	general_tags?: string[]
	nationalities?: string[]
	styles?: string[]
	gender?: string
	isActive?: boolean
	onlyWithoutDesc?: boolean
	onlyWithoutSocials?: boolean
	onlyWithoutPlatforms?: boolean
	onlyWithoutStyles?: boolean
	onlyWithStyles?: boolean
	verified?: boolean | null
	skipYoutubeMusicFilter?: boolean
}

export interface ArtistPageResult {
	artists: Artist[]
	total: number
	page: number
	limit: number
	totalPages: number
}

/**
 * Checks whether an artist exists with the YouTube Music ID
 */
export async function checkArtistExists(
	supabase: SupabaseClientType,
	idYoutubeMusic: string | null,
): Promise<boolean> {
	if (!idYoutubeMusic) return false

	const { data, error } = await supabase
		.from('artists')
		.select('id')
		.eq('id_youtube_music', idYoutubeMusic)
		.maybeSingle()

	if (error) {
		console.error("Erreur lors de la vérification de l'artiste:", error)
		throw new Error("Erreur lors de la vérification de l'artiste")
	}

	return !!data
}

/**
 * Fetches all artists with filtering options
 */
export async function fetchAllArtists(
	supabase: SupabaseClientType,
	options?: QueryOptions & FilterOptions,
): Promise<Artist[]> {
	let query = supabase.from('artists').select('*')

	if (options?.search) {
		query = query.ilike('name', `%${options.search}%`)
	}

	if (options?.isActive !== undefined) {
		query = query.eq('active_career', options.isActive)
	}

	if (options?.verified !== undefined) {
		query = query.eq('verified', options.verified)
	}

	if (options?.type) {
		query = query.eq('type', options.type as ArtistType)
	}

	if (options?.orderBy) {
		query = query.order(options.orderBy, {
			ascending: options.orderDirection === 'asc',
		})
	} else {
		query = query.order('name')
	}

	if (options?.limit) {
		query = query.limit(options.limit)
	}

	if (options?.offset) {
		query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
	}

	const { data, error } = await query

	if (error) {
		console.error('Erreur lors de la récupération des artistes:', error)
		throw new Error('Erreur lors de la récupération des artistes')
	}

	return data as Artist[]
}

/**
 * Fetches all artists (light version)
 */
export async function fetchAllArtistsLight(
	supabase: SupabaseClientType,
): Promise<Artist[]> {
	const { data, error } = await supabase.from('artists').select('*')

	if (error) {
		console.error('Erreur lors de la récupération des artistes:', error)
		throw new Error('Erreur lors de la récupération des artistes')
	}

	return data as Artist[]
}

/**
 * Fetches an artist by ID (light version)
 */
export async function fetchArtistById(
	supabase: SupabaseClientType,
	id: string,
): Promise<Artist> {
	const { data, error } = await supabase.from('artists').select('*').eq('id', id).single()

	if (error) {
		console.error("Erreur lors de la récupération de l'artiste:", error)
		throw new Error("Erreur lors de la récupération de l'artiste")
	}

	return data as Artist
}

/**
 * Fetches an artist with all details, including related records
 */
export async function fetchFullArtist(
	supabase: SupabaseClientType,
	id: string,
): Promise<Artist> {
	// Fetch the artist
	const { data: artist, error: artistError } = await supabase
		.from('artists')
		.select('*')
		.eq('id', id)
		.single()

	if (artistError) throw artistError

	// Fetch the groups (relations where the artist is a member)
	const { data: groups, error: groupsError } = await supabase
		.from('artist_relations')
		.select('group:artists!artist_relations_group_id_fkey(*)')
		.eq('member_id', id)

	if (groupsError) throw groupsError

	// Fetch the members (relations where the artist is the group)
	const { data: members, error: membersError } = await supabase
		.from('artist_relations')
		.select('member:artists!artist_relations_member_id_fkey(*)')
		.eq('group_id', id)

	if (membersError) throw membersError

	// Fetch the releases
	const { data: releases, error: releasesError } = await supabase
		.from('artist_releases')
		.select('release:releases(*)')
		.eq('artist_id', id)

	if (releasesError) throw releasesError

	// Fetch the companies
	const { data: companies, error: companiesError } = await supabase
		.from('artist_companies')
		.select('*, company:companies(*)')
		.eq('artist_id', id)

	if (companiesError) throw companiesError

	return {
		...artist,
		groups: groups?.map((g) => g.group) || [],
		members: members?.map((m) => m.member) || [],
		releases: releases?.map((r) => r.release) || [],
		companies: companies || [],
	} as Artist
}

/**
 * Fetches an artist's social and platform links
 */
export async function fetchArtistLinks(supabase: SupabaseClientType, id: string) {
	const { data: socialLinks, error: socialLinksError } = await supabase
		.from('artist_social_links')
		.select('*')
		.eq('artist_id', id)

	if (socialLinksError) {
		console.error('Error fetching social links:', socialLinksError)
		throw socialLinksError
	}

	const { data: platformLinks, error: platformLinksError } = await supabase
		.from('artist_platform_links')
		.select('*')
		.eq('artist_id', id)

	if (platformLinksError) {
		console.error('Error fetching platform links:', platformLinksError)
		throw platformLinksError
	}

	return {
		socialLinks: socialLinks || [],
		platformLinks: platformLinks || [],
	}
}

/**
 * Fetches artists with pagination and advanced filters
 */
export async function fetchArtistsByPage(
	supabase: SupabaseClientType,
	page: number,
	limit: number,
	options?: ArtistPageOptions,
): Promise<ArtistPageResult> {
	const offset = (page - 1) * limit

	let query = supabase.from('artists').select(
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

	if (options?.search) {
		const searchValue = options.search.trim()
		const normalizedSearch = searchValue.replaceAll('*', '')
		query = query.or(
			`name.ilike.*${normalizedSearch}*,description.ilike.*${normalizedSearch}*`,
		)
	}

	if (options?.type) {
		query = query.eq('type', options.type)
	}

	if (options?.gender) {
		query = query.eq('gender', options.gender as ArtistGender)
	}

	if (options?.general_tags?.length) {
		query = query.overlaps('general_tags', options.general_tags)
	}

	if (options?.nationalities?.length) {
		query = query.overlaps('nationalities', options.nationalities)
	}

	if (options?.styles?.length) {
		query = query.overlaps('styles', options.styles)
	}

	if (options?.isActive === true) {
		query = query.eq('active_career', true)
	} else if (options?.isActive === false) {
		query = query.or('active_career.is.false,active_career.is.null')
	}

	if (options?.onlyWithoutDesc) {
		query = query.or('description.is.null,description.eq.')
	}

	if (options?.onlyWithoutStyles) {
		query = query.or('styles.is.null,styles.eq.{}')
	}

	if (options?.onlyWithStyles) {
		query = query.not('styles', 'is', null).not('styles', 'eq', '{}')
	}

	// Apply the verified filter
	if (options?.verified !== undefined) {
		if (options.verified === null) {
			query = query.or('verified.is.null,verified.eq.false')
		} else {
			query = query.eq('verified', options.verified)
		}
	}

	// Filter to artists with an id_youtube_music
	if (!options?.skipYoutubeMusicFilter) {
		query = query.not('id_youtube_music', 'is', null)
	}

	// sorting
	if (options?.orderBy) {
		query = query.order(options.orderBy, {
			ascending: options.orderDirection === 'asc',
		})
	} else {
		query = query.order('name', { ascending: true })
	}

	// Pagination
	query = query.range(offset, offset + limit - 1)

	const { data, error, count } = await query

	if (error) {
		console.error('Erreur lors de la récupération des artistes:', error)
		throw new Error('Erreur lors de la récupération des artistes')
	}

	type ArtistWithCompanyGroup = Artist & {
		companies?: unknown[]
		groups?: Array<{ group?: Artist | null }> | Artist[]
	}

	// Transform the data
	let transformedData = (data as ArtistWithCompanyGroup[]).map((artist) => ({
		...artist,
		social_links: artist.social_links || [],
		platform_links: artist.platform_links || [],
		companies: artist.companies || [],
		groups:
			artist.groups
				?.map((g) => {
					if (typeof g === 'object' && g !== null && 'group' in g) {
						return (g as { group?: Artist | null }).group
					}
					return g as Artist
				})
				.filter(Boolean) || [],
	}))

	// Filtrage client-side for the relations
	if (options?.onlyWithoutSocials) {
		transformedData = transformedData.filter(
			(artist) => !artist.social_links || artist.social_links.length === 0,
		)
	}

	if (options?.onlyWithoutPlatforms) {
		transformedData = transformedData.filter(
			(artist) => !artist.platform_links || artist.platform_links.length === 0,
		)
	}

	return {
		artists: transformedData as Artist[],
		total: count || 0,
		page,
		limit,
		totalPages: Math.ceil((count || 0) / limit),
	}
}

/**
 * Fetches the most recently added artists
 */
export async function fetchLatestArtists(
	supabase: SupabaseClientType,
	limit: number,
): Promise<Artist[]> {
	const { data, error } = await supabase
		.from('artists')
		.select('*')
		.eq('verified', true)
		.order('created_at', { ascending: false })
		.limit(limit)

	if (error) {
		console.error('Erreur lors de la récupération des derniers artistes:', error)
		throw new Error('Erreur lors de la récupération des derniers artistes')
	}

	return data as Artist[]
}
