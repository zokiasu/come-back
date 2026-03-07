import type { Tables } from '../../types/api'
import {
	applyMusicFilters,
	applyMusicNameExclusions,
	applyVerifiedArtistFilter,
} from '../../utils/queryFilters'

const ALLOWED_ORDER_COLUMNS = ['date', 'name', 'created_at', 'release_year'] as const
type OrderColumn = (typeof ALLOWED_ORDER_COLUMNS)[number]
type MusicWithRelations = Tables<'musics'> & {
	artists?: Array<{ artist: Tables<'artists'> | null }>
	releases?: Array<{ release: Tables<'releases'> | null }>
}

type TransformedMusic = MusicWithRelations & {
	artists: Tables<'artists'>[]
	releases: Tables<'releases'>[]
}

const getComparableValue = (
	music: TransformedMusic,
	orderBy: OrderColumn,
): string | number | null | undefined => {
	switch (orderBy) {
		case 'date':
		case 'created_at':
			return music[orderBy] || ''
		case 'release_year':
			return music.release_year
		case 'name':
			return music.name || ''
	}
}

const sortTransformedMusics = (
	musics: TransformedMusic[],
	orderBy: OrderColumn,
	orderDirection: 'asc' | 'desc',
): TransformedMusic[] => {
	return [...musics].sort((left, right) => {
		const leftPrimary = getComparableValue(left, orderBy)
		const rightPrimary = getComparableValue(right, orderBy)

		if (leftPrimary !== rightPrimary) {
			if (leftPrimary == null) return 1
			if (rightPrimary == null) return -1

			if (typeof leftPrimary === 'number' && typeof rightPrimary === 'number') {
				return orderDirection === 'asc'
					? leftPrimary - rightPrimary
					: rightPrimary - leftPrimary
			}

			const primaryComparison =
				String(leftPrimary).localeCompare(String(rightPrimary), 'fr-FR')
			return orderDirection === 'asc' ? primaryComparison : -primaryComparison
		}

		const releaseComparison = (left.releases[0]?.name || '').localeCompare(
			right.releases[0]?.name || '',
			'fr-FR',
		)
		if (releaseComparison !== 0) {
			return releaseComparison
		}

		const artistComparison = (left.artists[0]?.name || '').localeCompare(
			right.artists[0]?.name || '',
			'fr-FR',
		)
		if (artistComparison !== 0) {
			return artistComparison
		}

		return (left.name || '').localeCompare(right.name || '', 'fr-FR')
	})
}

const transformMusics = (musics: MusicWithRelations[]): TransformedMusic[] => {
	return musics.map((music) => ({
		...music,
		artists: transformJunction(music.artists, 'artist'),
		releases: transformJunction(music.releases, 'release'),
	})) as TransformedMusic[]
}

export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()

	try {
		// Parse and validate query parameters
		const query = getQuery(event)
		const page = validatePageParam(Number(query.page))
		const limit = validateLimitParam(Number(query.limit), 20)
		const search = validateSearchParam(query.search as string | undefined)
		const years = validateNumericArrayParam(query.years as string | undefined, 'years')
		const orderBy = validateOrderBy(
			query.orderBy as string,
			ALLOWED_ORDER_COLUMNS,
			'date',
		) as OrderColumn
		const orderDirection = validateOrderDirection(query.orderDirection as string, 'desc')
		const ismv = query.ismv === 'true' ? true : query.ismv === 'false' ? false : undefined
		const artistIds = validateArrayParam(
			query.artistIds as string | undefined,
			'artistIds',
		)
		const styles = validateArrayParam(query.styles as string | undefined, 'styles')

		// Calculate offset
		const offset = (page - 1) * limit

		// Use optimized RPC function when filtering by styles (avoids large IN clauses)
		if (styles && styles.length > 0) {
			const { data: rpcData, error: rpcError } = await supabase.rpc(
				'get_paginated_musics_by_styles',
				{
					style_filters: styles,
					search_term: search || undefined,
					year_filters: years || undefined,
					is_mv: ismv ?? undefined,
					order_column: orderBy,
					order_dir: orderDirection,
					page_limit: limit,
					page_offset: offset,
				},
			)

			if (rpcError) {
				console.error('Error fetching musics by styles:', rpcError)
				throw rpcError
			}

			const musicIds = rpcData?.map((m: { id: string }) => m.id) || []
			const total = rpcData?.[0]?.total_count || 0

			// Fetch full music data with relations for the filtered IDs
			let musicsWithRelations: MusicWithRelations[] = []
			if (musicIds.length > 0) {
				let dataQuery = supabase
					.from('musics')
					.select(
						`
						*,
						artists:music_artists!inner(
							artist:artists!inner(*)
						),
						releases:music_releases(
							release:releases(*)
						)
					`,
					)
				dataQuery = applyVerifiedArtistFilter(dataQuery)
				const { data: fullData, error: fullError } = await dataQuery.in('id', musicIds)

				if (fullError) throw fullError

				// Preserve the order from RPC by sorting according to musicIds order
				const idOrderMap = new Map(musicIds.map((id, index) => [id, index]))
				musicsWithRelations = (fullData || []).sort(
					(a, b) => (idOrderMap.get(a.id) ?? 0) - (idOrderMap.get(b.id) ?? 0),
				)
			}

			const transformedData = transformMusics(musicsWithRelations)
			const totalPages = Math.ceil(Number(total) / limit)

			return {
				musics: sortTransformedMusics(transformedData, orderBy, orderDirection),
				total: Number(total),
				page,
				limit,
				totalPages,
			}
		}

		// Standard query path (no style filter)
		let musicIdsToFilter: string[] | undefined

		// Filter by specific artists
		if (artistIds && artistIds.length > 0) {
			const { data: musicArtistsData, error: musicArtistsError } = await supabase
				.from('music_artists')
				.select('music_id')
				.in('artist_id', artistIds)

			if (musicArtistsError) throw musicArtistsError

			musicIdsToFilter = [...new Set(musicArtistsData?.map((ma) => ma.music_id) || [])]
		}

		const countSelect = `
			id,
			artists:music_artists!inner(
				artist:artists!inner(id)
			)
		`
		const dataSelect = `
			*,
			artists:music_artists!inner(
				artist:artists!inner(*)
			),
			releases:music_releases(
				release:releases(*)
			)
		`

		const applySharedMusicFilters = <T>(query: T): T => {
			let nextQuery = applyVerifiedArtistFilter(query) as T

			if (musicIdsToFilter !== undefined) {
				nextQuery =
					musicIdsToFilter.length > 0
						? ((nextQuery as T & { in: (column: string, values: string[]) => T }).in('id', musicIdsToFilter) as T)
						: ((nextQuery as T & { eq: (column: string, value: string) => T }).eq('id', '00000000-0000-0000-0000-000000000000') as T)
			}

			nextQuery = applyMusicFilters(nextQuery, { search, years, ismv })
			nextQuery = applyMusicNameExclusions(nextQuery)

			return nextQuery
		}

		const buildCountQuery = () =>
			applySharedMusicFilters(
				supabase.from('musics').select(countSelect, { count: 'exact', head: true }),
			)

		const buildDataQuery = () =>
			applySharedMusicFilters(supabase.from('musics').select(dataSelect))

		const pageQuery = buildDataQuery()
			.order(orderBy, { ascending: orderDirection === 'asc' })
			.range(offset, offset + limit - 1)

		const [countResult, dataResult] = await Promise.all([buildCountQuery(), pageQuery])

		if (countResult.error) throw countResult.error
		if (dataResult.error) throw dataResult.error

		const total = countResult.count || 0
		const totalPages = Math.ceil(total / limit)
		const pageMusics = (dataResult.data || []) as MusicWithRelations[]
		const transformedPageMusics = transformMusics(pageMusics)

		if (orderBy !== 'date' || transformedPageMusics.length === 0) {
			return {
				musics: sortTransformedMusics(transformedPageMusics, orderBy, orderDirection),
				total,
				page,
				limit,
				totalPages,
			}
		}

		if (transformedPageMusics.some((music) => !music.date)) {
			return {
				musics: sortTransformedMusics(transformedPageMusics, orderBy, orderDirection),
				total,
				page,
				limit,
				totalPages,
			}
		}

		const orderedPageDates: string[] = []
		const seenDates = new Set<string>()
		for (const music of transformedPageMusics) {
			if (music.date && !seenDates.has(music.date)) {
				seenDates.add(music.date)
				orderedPageDates.push(music.date)
			}
		}

		const firstDate = orderedPageDates[0]
		const lastDate = orderedPageDates[orderedPageDates.length - 1]

		if (!firstDate || !lastDate) {
			return {
				musics: sortTransformedMusics(transformedPageMusics, orderBy, orderDirection),
				total,
				page,
				limit,
				totalPages,
			}
		}

		const boundaryDates = [...new Set([firstDate, lastDate])]
		const boundaryDateSet = new Set(boundaryDates)
		const pageStart = offset
		const pageEnd = offset + limit

		const boundaryGroups = await Promise.all(
			boundaryDates.map(async (date) => {
				const fullGroupQuery = buildDataQuery().eq('date', date)
				const beforeGroupQuery =
					orderDirection === 'asc'
						? buildCountQuery().lt('date', date)
						: buildCountQuery().gt('date', date)

				const [groupResult, beforeCountResult] = await Promise.all([
					fullGroupQuery,
					beforeGroupQuery,
				])

				if (groupResult.error) throw groupResult.error
				if (beforeCountResult.error) throw beforeCountResult.error

				return {
					date,
					groupStart: beforeCountResult.count || 0,
					musics: sortTransformedMusics(
						transformMusics((groupResult.data || []) as MusicWithRelations[]),
						orderBy,
						orderDirection,
					),
				}
			}),
		)

		const boundaryGroupMap = new Map(boundaryGroups.map((group) => [group.date, group]))
		const pageGroups = new Map<string, TransformedMusic[]>()

		for (const music of transformedPageMusics) {
			if (!music.date) continue
			const group = pageGroups.get(music.date) || []
			group.push(music)
			pageGroups.set(music.date, group)
		}

		const stablePageMusics: TransformedMusic[] = []
		for (const date of orderedPageDates) {
			if (boundaryDateSet.has(date)) {
				const boundaryGroup = boundaryGroupMap.get(date)
				if (!boundaryGroup) continue

				const sliceStart = Math.max(0, pageStart - boundaryGroup.groupStart)
				const sliceEnd = Math.min(
					boundaryGroup.musics.length,
					pageEnd - boundaryGroup.groupStart,
				)

				if (sliceStart < sliceEnd) {
					stablePageMusics.push(...boundaryGroup.musics.slice(sliceStart, sliceEnd))
				}
				continue
			}

			const pageGroup = pageGroups.get(date) || []
			stablePageMusics.push(...sortTransformedMusics(pageGroup, orderBy, orderDirection))
		}

		return {
			musics: stablePageMusics,
			total,
			page,
			limit,
			totalPages,
		}
	} catch (error) {
		console.error('Error fetching paginated musics:', error)

		// Check if it's a Supabase error
		if (isPostgrestError(error)) {
			throw handleSupabaseError(error, 'musics.paginated')
		}

		// Otherwise, it's an unexpected error
		throw createInternalError('Failed to fetch paginated musics', error)
	}
})


