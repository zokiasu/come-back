import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	formatDate,
	formatDateForInput,
	formatDateTime,
	formatDuration,
	formatNumber,
	formatTimeAgo,
} from '../../../app/utils/date'

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

	it('accepts a custom locale', () => {
		expect(
			formatDate(
				new Date(2026, 5, 2, 12, 0),
				{ day: '2-digit', month: '2-digit', year: 'numeric' },
				'en-GB',
			),
		).toBe('02/06/2026')
	})

	it('returns an empty string for empty or invalid values', () => {
		expect(formatDate(null)).toBe('')
		expect(formatDate(undefined)).toBe('')
		expect(formatDate('')).toBe('')
		expect(formatDate('not-a-date')).toBe('')
	})
})

describe('formatDateTime', () => {
	it('formats date and time with the requested locale', () => {
		expect(
			formatDateTime(
				new Date(2026, 5, 2, 15, 30),
				{
					day: '2-digit',
					month: 'short',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
				},
				'en-GB',
			),
		).toBe('02 Jun 2026, 15:30')
	})

	it('returns an empty string for empty or invalid values', () => {
		expect(formatDateTime(null)).toBe('')
		expect(formatDateTime('not-a-date')).toBe('')
	})
})

describe('formatDateForInput', () => {
	it('returns the YYYY-MM-DD value', () => {
		expect(formatDateForInput('2026-06-02T15:30:00.000Z')).toBe('2026-06-02')
		expect(formatDateForInput(new Date('2026-01-15T00:00:00.000Z'))).toBe('2026-01-15')
	})

	it('returns an empty string for empty or invalid values', () => {
		expect(formatDateForInput(null)).toBe('')
		expect(formatDateForInput('')).toBe('')
		expect(formatDateForInput('not-a-date')).toBe('')
	})
})

describe('formatTimeAgo', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('returns relative labels for recent values', () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date(2026, 5, 2, 12, 0, 0))

		expect(formatTimeAgo(new Date(2026, 5, 2, 11, 59, 30))).toBe('just now')
		expect(formatTimeAgo(new Date(2026, 5, 2, 11, 55, 0))).toBe('5m ago')
		expect(formatTimeAgo(new Date(2026, 5, 2, 9, 0, 0))).toBe('3h ago')
		expect(formatTimeAgo(new Date(2026, 4, 31, 12, 0, 0))).toBe('2d ago')
	})

	it('falls back to a formatted date after 30 days', () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date(2026, 5, 2, 12, 0, 0))

		expect(formatTimeAgo(new Date(2026, 3, 1, 12, 0, 0))).toBe('April 1, 2026')
		expect(
			formatTimeAgo(new Date(2026, 3, 1, 12, 0, 0), { day: 'numeric', month: 'short' }),
		).toBe('Apr 1')
	})

	it('returns an empty string for invalid values', () => {
		expect(formatTimeAgo('not-a-date')).toBe('')
	})
})

describe('formatDuration', () => {
	it('formats seconds as minutes:seconds', () => {
		expect(formatDuration(185)).toBe('3:05')
		expect(formatDuration(59)).toBe('0:59')
		expect(formatDuration(0)).toBe('0:00')
	})

	it('returns an empty string for empty values', () => {
		expect(formatDuration(null)).toBe('')
		expect(formatDuration(undefined)).toBe('')
	})
})

describe('formatNumber', () => {
	it('formats numbers with the app locale', () => {
		expect(formatNumber(12345)).toBe(new Intl.NumberFormat('sv-SE').format(12345))
	})
})
