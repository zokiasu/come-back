import { describe, expect, it } from 'vitest'
import {
	applyMusicFilters,
	applyMusicNameExclusions,
	applyReleaseFilters,
	applyVerifiedArtistFilter,
} from '#server/utils/queryFilters'

type QueryCall = {
	method: 'eq' | 'ilike' | 'in' | 'not'
	args: unknown[]
}

type QueryRecorder = {
	calls: QueryCall[]
	eq: (column: string, value: unknown) => QueryRecorder
	ilike: (column: string, value: string) => QueryRecorder
	in: (column: string, values: unknown[]) => QueryRecorder
	not: (column: string, operator: string, value: string) => QueryRecorder
}

const createQueryRecorder = (): QueryRecorder => {
	const query: QueryRecorder = {
		calls: [],
		eq(column, value) {
			this.calls.push({ method: 'eq', args: [column, value] })
			return this
		},
		ilike(column, value) {
			this.calls.push({ method: 'ilike', args: [column, value] })
			return this
		},
		in(column, values) {
			this.calls.push({ method: 'in', args: [column, values] })
			return this
		},
		not(column, operator, value) {
			this.calls.push({ method: 'not', args: [column, operator, value] })
			return this
		},
	}

	return query
}

describe('applyVerifiedArtistFilter', () => {
	it('should filter nested verified artists', () => {
		const query = createQueryRecorder()

		applyVerifiedArtistFilter(query)

		expect(query.calls).toEqual([
			{ method: 'eq', args: ['artists.artist.verified', true] },
		])
	})
})

describe('applyReleaseFilters', () => {
	it('should apply only provided release filters', () => {
		const query = createQueryRecorder()

		applyReleaseFilters(query, {
			search: 'girls',
			type: 'ALBUM',
			verified: false,
		})

		expect(query.calls).toEqual([
			{ method: 'ilike', args: ['name', '%girls%'] },
			{ method: 'eq', args: ['type', 'ALBUM'] },
			{ method: 'eq', args: ['verified', false] },
		])
	})

	it('should not add filters when values are omitted', () => {
		const query = createQueryRecorder()

		applyReleaseFilters(query, {})

		expect(query.calls).toEqual([])
	})
})

describe('applyMusicFilters', () => {
	it('should apply search, years and MV filters', () => {
		const query = createQueryRecorder()

		applyMusicFilters(query, {
			search: 'supernova',
			years: [2023, 2024],
			ismv: true,
		})

		expect(query.calls).toEqual([
			{ method: 'ilike', args: ['name', '%supernova%'] },
			{ method: 'in', args: ['release_year', [2023, 2024]] },
			{ method: 'eq', args: ['ismv', true] },
		])
	})

	it('should ignore empty year filters', () => {
		const query = createQueryRecorder()

		applyMusicFilters(query, { years: [] })

		expect(query.calls).toEqual([])
	})
})

describe('applyMusicNameExclusions', () => {
	it('should exclude common non-primary track variants', () => {
		const query = createQueryRecorder()

		applyMusicNameExclusions(query)

		expect(query.calls).toEqual([
			{ method: 'not', args: ['name', 'ilike', '%Inst.%'] },
			{ method: 'not', args: ['name', 'ilike', '%Instrumental%'] },
			{ method: 'not', args: ['name', 'ilike', '%Sped Up%'] },
			{ method: 'not', args: ['name', 'ilike', '%(live)%'] },
			{ method: 'not', args: ['name', 'ilike', '%[live]%'] },
			{ method: 'not', args: ['name', 'ilike', '% - Live%'] },
		])
	})
})
