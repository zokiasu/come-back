import type {
	ArtistWithRelations,
	ReleaseWithRelations,
	MusicWithRelations,
	Tables,
} from '#server/types/api'

/**
 * Type for junction table row with a nested entity
 * Used when Supabase returns junction data with nested relations
 */
export type JunctionRow<K extends string, T> = {
	[key in K]: T | null
}

/**
 * Type for raw data from Supabase that may include junction tables
 */
export type RawArtistData = Tables<'artists'> & {
	groups?: JunctionRow<'group', Tables<'artists'>>[]
	members?: JunctionRow<'member', Tables<'artists'>>[]
	releases?: JunctionRow<'release', Tables<'releases'>>[]
	companies?: (Tables<'artist_companies'> & { company: Tables<'companies'> })[]
	social_links?: Tables<'artist_social_links'>[]
	platform_links?: Tables<'artist_platform_links'>[]
}

export type RawReleaseData = Tables<'releases'> & {
	artists?: JunctionRow<'artist', Tables<'artists'>>[]
	musics?: JunctionRow<'music', Tables<'musics'>>[]
	platform_links?: Tables<'release_platform_links'>[]
}

export type RawMusicData = Tables<'musics'> & {
	artists?: JunctionRow<'artist', Tables<'artists'>>[]
	releases?: JunctionRow<'release', Tables<'releases'>>[]
}

/**
 * Generic transformer for junction table data
 * Extracts the related entity from junction table results
 *
 * @param junctionData - Array of junction table rows
 * @param key - The key in the junction object that contains the related entity
 * @returns Array of extracted entities
 *
 * @example
 * ```typescript
 * // Transform artist_releases junction to just releases
 * const releases = transformJunction(artistReleases, 'release')
 * // Result: release[]
 * ```
 */
export const transformJunction = <T, K extends string>(
	junctionData: JunctionRow<K, T>[] | null | undefined,
	key: K,
): T[] => {
	if (!junctionData || junctionData.length === 0) return []
	return junctionData.map((item) => item[key]).filter((item): item is T => item !== null)
}

/**
 * Transforms raw artist data with junction tables into a structured ArtistWithRelations
 *
 * @param rawArtist - Raw artist data from database
 * @param options - Optional related data to include
 * @returns Transformed artist with relations
 *
 * @example
 * ```typescript
 * const { data } = await supabase
 *   .from('artists')
 *   .select(`
 *     *,
 *     artist_releases(release:releases(*)),
 *     artist_relations!member_id(group:artists(*))
 *   `)
 *   .eq('id', artistId)
 *   .single()
 *
 * const artist = transformArtistWithRelations(data)
 * ```
 */
export const transformArtistWithRelations = (
	rawArtist: RawArtistData,
	options?: {
		includeGroups?: boolean
		includeMembers?: boolean
		includeReleases?: boolean
		includeCompanies?: boolean
		includeSocialLinks?: boolean
		includePlatformLinks?: boolean
	},
): ArtistWithRelations => {
	const {
		groups: _groups,
		members: _members,
		releases: _releases,
		companies: _companies,
		social_links: _socialLinks,
		platform_links: _platformLinks,
		...artistBase
	} = rawArtist
	const artist = { ...artistBase } as ArtistWithRelations

	// Transform groups (artist is a member of these groups)
	if (options?.includeGroups && rawArtist.groups) {
		artist.groups = transformJunction(rawArtist.groups, 'group')
	}

	// Transform members (artist is a group, these are its members)
	if (options?.includeMembers && rawArtist.members) {
		artist.members = transformJunction(rawArtist.members, 'member')
	}

	// Transform releases
	if (options?.includeReleases && rawArtist.releases) {
		artist.releases = transformJunction(rawArtist.releases, 'release')
	}

	// Transform companies (already has company nested, just clean up)
	if (options?.includeCompanies && rawArtist.companies) {
		artist.companies = rawArtist.companies
	}

	// Social links and platform links are direct, no junction transformation needed
	if (options?.includeSocialLinks && rawArtist.social_links) {
		artist.social_links = rawArtist.social_links
	}

	if (options?.includePlatformLinks && rawArtist.platform_links) {
		artist.platform_links = rawArtist.platform_links
	}

	return artist
}

/**
 * Transforms raw release data with junction tables into a structured ReleaseWithRelations
 *
 * @param rawRelease - Raw release data from database
 * @param options - Optional related data to include
 * @returns Transformed release with relations
 *
 * @example
 * ```typescript
 * const { data } = await supabase
 *   .from('releases')
 *   .select(`
 *     *,
 *     release_artists(artist:artists(*)),
 *     release_musics(music:musics(*))
 *   `)
 *   .eq('id', releaseId)
 *   .single()
 *
 * const release = transformReleaseWithRelations(data)
 * ```
 */
export const transformReleaseWithRelations = (
	rawRelease: RawReleaseData,
	options?: {
		includeArtists?: boolean
		includeMusics?: boolean
		includePlatformLinks?: boolean
	},
): ReleaseWithRelations => {
	const {
		artists: _artists,
		musics: _musics,
		platform_links: _platformLinks,
		...releaseBase
	} = rawRelease
	const release = { ...releaseBase } as ReleaseWithRelations

	// Transform artists
	if (options?.includeArtists && rawRelease.artists) {
		release.artists = transformJunction(rawRelease.artists, 'artist')
	}

	// Transform musics
	if (options?.includeMusics && rawRelease.musics) {
		release.musics = transformJunction(rawRelease.musics, 'music')
	}

	// Platform links are direct
	if (options?.includePlatformLinks && rawRelease.platform_links) {
		release.platform_links = rawRelease.platform_links
	}

	return release
}

/**
 * Transforms raw music data with junction tables into a structured MusicWithRelations
 *
 * @param rawMusic - Raw music data from database
 * @param options - Optional related data to include
 * @returns Transformed music with relations
 *
 * @example
 * ```typescript
 * const { data } = await supabase
 *   .from('musics')
 *   .select(`
 *     *,
 *     music_artists(artist:artists(*)),
 *     music_releases(release:releases(*))
 *   `)
 *
 * const musics = data.map(m => transformMusicWithRelations(m))
 * ```
 */
export const transformMusicWithRelations = (
	rawMusic: RawMusicData,
	options?: {
		includeArtists?: boolean
		includeReleases?: boolean
	},
): MusicWithRelations => {
	const { artists: _artists, releases: _releases, ...musicBase } = rawMusic
	const music = { ...musicBase } as MusicWithRelations

	// Transform artists
	if (options?.includeArtists && rawMusic.artists) {
		music.artists = transformJunction(rawMusic.artists, 'artist')
	}

	// Transform releases
	if (options?.includeReleases && rawMusic.releases) {
		music.releases = transformJunction(rawMusic.releases, 'release')
	}

	return music
}

/**
 * Batch transforms multiple items using a transformer function
 *
 * @param items - Array of items to transform
 * @param transformer - Transformation function to apply to each item
 * @returns Array of transformed items
 *
 * @example
 * ```typescript
 * const artists = batchTransform(rawArtists, (raw) =>
 *   transformArtistWithRelations(raw, { includeReleases: true })
 * )
 * ```
 */
export const batchTransform = <T, R>(
	items: T[] | null | undefined,
	transformer: (item: T) => R,
): R[] => {
	if (!items || items.length === 0) return []
	return items.map(transformer)
}
