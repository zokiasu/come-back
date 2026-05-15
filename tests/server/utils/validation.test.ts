import { describe, expect, it } from 'vitest'
import {
	validateArrayParam,
	validateLimitParam,
	validateNumericArrayParam,
	validateOrderBy,
	validateOrderDirection,
	validatePageParam,
	validateSearchParam,
	VALIDATION_LIMITS,
} from '#server/utils/validation'

const expectBadRequest = (action: () => unknown) => {
	expect(action).toThrowError(
		expect.objectContaining({
			statusCode: 400,
			statusMessage: 'Bad Request',
		}),
	)
}

describe('validateSearchParam', () => {
	it('should trim search input and keep empty strings undefined', () => {
		expect(validateSearchParam(undefined)).toBeUndefined()
		expect(validateSearchParam('  aespa  ')).toBe('aespa')
	})

	it('should reject search input over the max length', () => {
		const oversizedSearch = 'a'.repeat(VALIDATION_LIMITS.MAX_SEARCH_LENGTH + 1)

		expectBadRequest(() => validateSearchParam(oversizedSearch))
	})
})

describe('validateArrayParam', () => {
	it('should parse comma-separated values and remove empty items', () => {
		expect(validateArrayParam('a,,b,c,', 'artistIds')).toEqual(['a', 'b', 'c'])
	})

	it('should reject arrays over the max item count', () => {
		const tooManyItems = Array.from(
			{ length: VALIDATION_LIMITS.MAX_ARRAY_ITEMS + 1 },
			(_, index) => `item-${index}`,
		).join(',')

		expectBadRequest(() => validateArrayParam(tooManyItems, 'artistIds'))
	})
})

describe('validateNumericArrayParam', () => {
	it('should parse numbers from comma-separated values', () => {
		expect(validateNumericArrayParam('2022,2023,2024', 'years')).toEqual([
			2022, 2023, 2024,
		])
	})

	it('should reject invalid numbers and out-of-range values', () => {
		expectBadRequest(() => validateNumericArrayParam('2023,soon', 'years'))
		expectBadRequest(() => validateNumericArrayParam('1899', 'years'))
		expectBadRequest(() => validateNumericArrayParam('2101', 'years'))
	})
})

describe('pagination validators', () => {
	it('should default and clamp limit values', () => {
		expect(validateLimitParam(undefined, 24)).toBe(24)
		expect(validateLimitParam(Number.NaN, 24)).toBe(24)
		expect(validateLimitParam(-10, 24)).toBe(VALIDATION_LIMITS.MIN_PAGE_SIZE)
		expect(validateLimitParam(500, 24)).toBe(VALIDATION_LIMITS.MAX_PAGE_SIZE)
	})

	it('should default invalid pages and floor valid page values', () => {
		expect(validatePageParam(undefined)).toBe(1)
		expect(validatePageParam(0)).toBe(1)
		expect(validatePageParam(3.8)).toBe(3)
	})
})

describe('order validators', () => {
	it('should validate order direction', () => {
		expect(validateOrderDirection('asc')).toBe('asc')
		expect(validateOrderDirection('desc')).toBe('desc')
		expect(validateOrderDirection('sideways', 'asc')).toBe('asc')
	})

	it('should validate order columns against an allow list', () => {
		const allowedColumns = ['name', 'date'] as const

		expect(validateOrderBy('date', allowedColumns, 'name')).toBe('date')
		expect(validateOrderBy('created_at', allowedColumns, 'name')).toBe('name')
		expect(validateOrderBy(undefined, allowedColumns, 'name')).toBe('name')
	})
})
