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
	styles?: string[]
	gender?: string
	isActive?: boolean
	onlyWithoutDesc?: boolean
	onlyWithoutSocials?: boolean
	onlyWithoutPlatforms?: boolean
	onlyWithoutStyles?: boolean
}

export interface ArtistPageResult {
	artists: Artist[]
	total: number
	page: number
	limit: number
	totalPages: number
}

/**
 * Vérifie si un artiste existe avec l'ID YouTube Music
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
 * Récupère tous les artistes avec options de filtrage
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
 * Récupère tous les artistes (version légère)
 */
export async function fetchAllArtistsLight(supabase: SupabaseClientType): Promise<Artist[]> {
	const { data, error } = await supabase.from('artists').select('*')

	if (error) {
		console.error('Erreur lors de la récupération des artistes:', error)
		throw new Error('Erreur lors de la récupération des artistes')
	}

	return data as Artist[]
}

/**
 * Récupère un artiste par son ID (version légère)
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
 * Récupère un artiste avec tous ses détails (relations incluses)
 */
export async function fetchFullArtist(
	supabase: SupabaseClientType,
	id: string,
): Promise<Artist> {
	// Récupérer l'artiste
	const { data: artist, error: artistError } = await supabase
		.from('artists')
		.select('*')
		.eq('id', id)
		.single()

	if (artistError) throw artistError

	// Récupérer les groupes (relations où l'artiste est membre)
	const { data: groups, error: groupsError } = await supabase
		.from('artist_relations')
		.select('group:artists!artist_relations_group_id_fkey(*)')
		.eq('member_id', id)

	if (groupsError) throw groupsError

	// Récupérer les membres (relations où l'artiste est groupe)
	const { data: members, error: membersError } = await supabase
		.from('artist_relations')
		.select('member:artists!artist_relations_member_id_fkey(*)')
		.eq('group_id', id)

	if (membersError) throw membersError

	// Récupérer les releases
	const { data: releases, error: releasesError } = await supabase
		.from('artist_releases')
		.select('release:releases(*)')
		.eq('artist_id', id)

	if (releasesError) throw releasesError

	// Récupérer les compagnies
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
 * Récupère les liens sociaux et de plateformes d'un artiste
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
 * Récupère les artistes avec pagination et filtres avancés
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

	// Appliquer les filtres
	if (options?.search) {
		query = query.ilike('name', `%${options.search}%`)
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

	// Filtre pour n'avoir que les artistes avec un id_youtube_music
	query = query.not('id_youtube_music', 'is', null)

	// Tri
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

	// Transformer les données
	let transformedData = data.map((artist: any) => ({
		...artist,
		social_links: artist.social_links || [],
		platform_links: artist.platform_links || [],
		companies: artist.companies || [],
		groups: artist.groups?.map((g: any) => g.group).filter(Boolean) || [],
	}))

	// Filtrage côté client pour les relations
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
 * Récupère les derniers artistes ajoutés
 */
export async function fetchLatestArtists(
	supabase: SupabaseClientType,
	limit: number,
): Promise<Artist[]> {
	const { data, error } = await supabase
		.from('artists')
		.select('*')
		.order('created_at', { ascending: false })
		.limit(limit)

	if (error) {
		console.error('Erreur lors de la récupération des derniers artistes:', error)
		throw new Error('Erreur lors de la récupération des derniers artistes')
	}

	return data as Artist[]
}
