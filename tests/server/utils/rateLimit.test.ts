import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkRateLimit, RATE_LIMIT_PRESETS } from '#server/utils/rateLimit'

let keyCounter = 0

const createEvent = (overrides: { path?: string; ip?: string } = {}) => {
	return {
		path: overrides.path ?? '/api/test',
		node: {
			req: {
				url: overrides.path ?? '/api/test',
			},
		},
	} as unknown as H3Event
}

	describe('rateLimit', () => {
	beforeEach(() => {
		vi.unstubAllGlobals()
		vi.stubGlobal('getRequestIP', vi.fn(() => '127.0.0.1'))
		vi.stubGlobal('createError', (err: unknown) => err)
		keyCounter++
	})

	it('should allow requests under the limit', () => {
		const event = createEvent()

		for (let i = 0; i < 5; i++) {
			expect(() =>
				checkRateLimit(event, {
					maxRequests: 5,
					windowMs: 60_000,
					keyGenerator: () => `under-limit:${keyCounter}`,
				}),
			).not.toThrow()
		}
	})

	it('should throw a 429 error when the limit is exceeded', () => {
		const event = createEvent()
		const options = {
			maxRequests: 1,
			windowMs: 60_000,
			keyGenerator: () => `exceeded:${keyCounter}`,
		}

		expect(() => checkRateLimit(event, options)).not.toThrow()

		expect(() => checkRateLimit(event, options)).toThrow(
			expect.objectContaining({
				statusCode: 429,
				statusMessage: 'Too Many Requests',
			}),
		)
	})

	it('should reset the counter after the window expires', () => {
		const event = createEvent()
		const options = {
			maxRequests: 1,
			windowMs: 60_000,
			keyGenerator: () => `reset:${keyCounter}`,
		}

		checkRateLimit(event, options)

		// Simulate time passing beyond the window
		vi.useFakeTimers()
		vi.advanceTimersByTime(61_000)

		expect(() => checkRateLimit(event, options)).not.toThrow()

		vi.useRealTimers()
	})

	it('should use a custom key generator when provided', () => {
		const event = createEvent()
		const options = {
			maxRequests: 1,
			windowMs: 60_000,
			keyGenerator: () => `custom-key:${keyCounter}`,
		}

		checkRateLimit(event, options)

		// Different path but same custom key should still be rate limited
		const otherEvent = createEvent({ path: '/api/other' })
		expect(() => checkRateLimit(otherEvent, options)).toThrow(
			expect.objectContaining({
				statusCode: 429,
			}),
		)
	})

	it('exposes sensible presets', () => {
		expect(RATE_LIMIT_PRESETS.follow.maxRequests).toBe(30)
		expect(RATE_LIMIT_PRESETS.search.maxRequests).toBe(60)
		expect(RATE_LIMIT_PRESETS.paginated.maxRequests).toBe(120)
	})
})
