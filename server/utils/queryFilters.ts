type ChainableQuery = any

export const applyVerifiedArtistFilter = <T>(query: T): T => {
	const q = query as ChainableQuery
	return q.eq('artists.artist.verified', true) as T
}

export const applyReleaseFilters = <T>(
	query: T,
	filters: { search?: string; type?: string; verified?: boolean },
): T => {
	let q = query as ChainableQuery

	if (filters.search) {
		q = q.ilike('name', `%${filters.search}%`)
	}

	if (filters.type) {
		q = q.eq('type', filters.type)
	}

	if (filters.verified !== undefined) {
		q = q.eq('verified', filters.verified)
	}

	return q as T
}

export const applyMusicFilters = <T>(
	query: T,
	filters: { search?: string; years?: number[]; ismv?: boolean },
): T => {
	let q = query as ChainableQuery

	if (filters.search) {
		q = q.ilike('name', `%${filters.search}%`)
	}

	if (filters.years && filters.years.length > 0) {
		q = q.in('release_year', filters.years)
	}

	if (filters.ismv !== undefined) {
		q = q.eq('ismv', filters.ismv)
	}

	return q as T
}

export const applyMusicNameExclusions = <T>(query: T): T => {
	let q = query as ChainableQuery

	// Exclude instrumental, sped up, and live versions
	q = q.not('name', 'ilike', '%Inst.%')
	q = q.not('name', 'ilike', '%Instrumental%')
	q = q.not('name', 'ilike', '%Sped Up%')
	q = q.not('name', 'ilike', '%(live)%')
	q = q.not('name', 'ilike', '%[live]%')
	q = q.not('name', 'ilike', '% - Live%')

	return q as T
}
