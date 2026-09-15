import { describe, expect, it } from 'vitest'
import { formatDate, formatNumber } from '../../../app/utils/date'

describe('formatDate', () => {
	it('formats an ISO date as YYYY-MM-DD', () => {
		expect(formatDate('2026-06-02T12:00:00.000Z')).toBe('2026-06-02')
	})

	it('accepts Date instances and timestamps', () => {
		expect(formatDate(new Date('2026-01-15T00:00:00.000Z'))).toBe('2026-01-15')
		expect(formatDate(new Date('2026-01-15T00:00:00.000Z').getTime())).toBe('2026-01-15')
	})

	it('applies Intl options', () => {
		expect(
			formatDate('2026-01-15T00:00:00.000Z', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			}),
		).toBe('2026-01-15')
	})

	it('returns an empty string for empty or invalid values', () => {
		expect(formatDate(null)).toBe('')
		expect(formatDate(undefined)).toBe('')
		expect(formatDate('')).toBe('')
		expect(formatDate('not-a-date')).toBe('')
	})
})

describe('formatNumber', () => {
	it('formats numbers with the app locale', () => {
		expect(formatNumber(12345)).toBe(new Intl.NumberFormat('sv-SE').format(12345))
	})
})
