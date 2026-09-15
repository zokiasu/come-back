import type { H3Event } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkRateLimit, RATE_LIMIT_PRESETS } from '#server/utils/rateLimit'

let keyCounter = 0

const REDIS_URL_KEY = 'UPSTASH_REDIS_REST_URL'
const REDIS_TOKEN_KEY = 'UPSTASH_REDIS_REST_TOKEN'

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

const stubRedis = (results: Array<{ result?: unknown; error?: string }>) => {
	vi.stubEnv(REDIS_URL_KEY, 'https://redis.example.com')
	vi.stubEnv(REDIS_TOKEN_KEY, 'secret-token')

	const fetchMock = vi.fn(async () => ({
		ok: true,
		json: async () => results,
	}))

	vi.stubGlobal('fetch', fetchMock)

	return fetchMock
}

describe('rateLimit', () => {
	beforeEach(() => {
		vi.unstubAllGlobals()
		vi.stubGlobal(
			'getRequestIP',
			vi.fn(() => '127.0.0.1'),
		)
		vi.stubGlobal('createError', (err: unknown) => err)
		keyCounter++
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	it('should allow requests under the limit', async () => {
		const event = createEvent()

		for (let i = 0; i < 5; i++) {
			await expect(
				checkRateLimit(event, {
					maxRequests: 5,
					windowMs: 60_000,
					keyGenerator: () => `under-limit:${keyCounter}`,
				}),
			).resolves.toBeUndefined()
		}
	})

	it('should throw a 429 error when the limit is exceeded', async () => {
		const event = createEvent()
		const options = {
			maxRequests: 1,
			windowMs: 60_000,
			keyGenerator: () => `exceeded:${keyCounter}`,
		}

		await expect(checkRateLimit(event, options)).resolves.toBeUndefined()

		await expect(checkRateLimit(event, options)).rejects.toMatchObject({
			statusCode: 429,
			statusMessage: 'Too Many Requests',
		})
	})

	it('should reset the counter after the window expires', async () => {
		const event = createEvent()
		const options = {
			maxRequests: 1,
			windowMs: 60_000,
			keyGenerator: () => `reset:${keyCounter}`,
		}

		await checkRateLimit(event, options)

		// Simulate time passing beyond the window
		vi.useFakeTimers()
		vi.advanceTimersByTime(61_000)

		await expect(checkRateLimit(event, options)).resolves.toBeUndefined()

		vi.useRealTimers()
	})

	it('should use a custom key generator when provided', async () => {
		const event = createEvent()
		const options = {
			maxRequests: 1,
			windowMs: 60_000,
			keyGenerator: () => `custom-key:${keyCounter}`,
		}

		await checkRateLimit(event, options)

		// Different path but same custom key should still be rate limited
		const otherEvent = createEvent({ path: '/api/other' })
		await expect(checkRateLimit(otherEvent, options)).rejects.toMatchObject({
			statusCode: 429,
		})
	})

	it('should not allow query parameters to bypass a route limit', async () => {
		const options = { maxRequests: 1, windowMs: 60_000 }

		await checkRateLimit(
			createEvent({ path: `/api/query-limit-${keyCounter}?page=1` }),
			options,
		)

		await expect(
			checkRateLimit(
				createEvent({ path: `/api/query-limit-${keyCounter}?page=2` }),
				options,
			),
		).rejects.toMatchObject({ statusCode: 429 })
	})

	it('uses the distributed Redis store when configured', async () => {
		const fetchMock = stubRedis([{ result: 1 }, { result: 1 }, { result: 60_000 }])

		await expect(
			checkRateLimit(createEvent(), {
				maxRequests: 5,
				windowMs: 60_000,
				keyGenerator: () => `redis-under:${keyCounter}`,
			}),
		).resolves.toBeUndefined()

		expect(fetchMock).toHaveBeenCalledWith(
			'https://redis.example.com/pipeline',
			expect.objectContaining({ method: 'POST' }),
		)
	})

	it('throws a 429 when the distributed counter exceeds the limit', async () => {
		stubRedis([{ result: 11 }, { result: 1 }, { result: 30_000 }])

		await expect(
			checkRateLimit(createEvent(), {
				maxRequests: 10,
				windowMs: 60_000,
				keyGenerator: () => `redis-exceeded:${keyCounter}`,
			}),
		).rejects.toMatchObject({
			statusCode: 429,
			statusMessage: 'Too Many Requests',
		})
	})

	it('falls back to the in-memory store when Redis is unreachable', async () => {
		vi.stubEnv(REDIS_URL_KEY, 'https://redis.example.com')
		vi.stubEnv(REDIS_TOKEN_KEY, 'secret-token')
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('network down')
			}),
		)
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		await expect(
			checkRateLimit(createEvent(), {
				maxRequests: 1,
				windowMs: 60_000,
				keyGenerator: () => `redis-fallback:${keyCounter}`,
			}),
		).resolves.toBeUndefined()

		await expect(
			checkRateLimit(createEvent(), {
				maxRequests: 1,
				windowMs: 60_000,
				keyGenerator: () => `redis-fallback:${keyCounter}`,
			}),
		).rejects.toMatchObject({ statusCode: 429 })
	})

	it('exposes sensible presets', () => {
		expect(RATE_LIMIT_PRESETS.follow.maxRequests).toBe(30)
		expect(RATE_LIMIT_PRESETS.search.maxRequests).toBe(60)
		expect(RATE_LIMIT_PRESETS.paginated.maxRequests).toBe(120)
		expect(RATE_LIMIT_PRESETS.catalogScan.maxRequests).toBe(30)
		expect(RATE_LIMIT_PRESETS.publicRead.maxRequests).toBe(300)
	})
	it.each(['headers', 'body'])(
		'falls back when Redis stalls during %s',
		async (stage) => {
			vi.useFakeTimers()
			vi.stubEnv(REDIS_URL_KEY, 'https://redis.example.com')
			vi.stubEnv(REDIS_TOKEN_KEY, 'secret-token')
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)
			vi.stubGlobal(
				'fetch',
				vi.fn((_url: string, init: RequestInit) => {
					const stalled = () =>
						new Promise<never>((_resolve, reject) => {
							init.signal!.addEventListener('abort', () => reject(new Error('aborted')), {
								once: true,
							})
						})
					return stage === 'headers'
						? stalled()
						: Promise.resolve({ ok: true, json: stalled })
				}),
			)
			const options = {
				maxRequests: 1,
				windowMs: 60_000,
				keyGenerator: () => 'timeout-' + stage + keyCounter,
			}
			const first = expect(
				checkRateLimit(createEvent(), options),
			).resolves.toBeUndefined()
			await vi.advanceTimersByTimeAsync(1_000)
			await first
			const second = expect(checkRateLimit(createEvent(), options)).rejects.toMatchObject(
				{ statusCode: 429 },
			)
			await vi.advanceTimersByTimeAsync(1_000)
			await second
			expect(vi.getTimerCount()).toBe(0)
		},
	)
})
