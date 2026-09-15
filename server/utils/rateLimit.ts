import type { H3Event } from 'h3'

interface RateLimitEntry {
	count: number
	resetAt: number
}

interface RateLimitOptions {
	/** Maximum number of requests allowed within the window */
	maxRequests: number
	/** Time window in milliseconds */
	windowMs: number
	/** Optional custom key generator (defaults to IP + route) */
	keyGenerator?: (event: H3Event) => string
}

const store = new Map<string, RateLimitEntry>()
const MAX_STORE_ENTRIES = 10_000
const REDIS_KEY_PREFIX = 'ratelimit:'
const REDIS_TIMEOUT_MS = 1_000

const removeExpiredEntries = (now: number) => {
	for (const [key, entry] of store) {
		if (entry.resetAt <= now) store.delete(key)
	}
}

const defaultKeyGenerator = (event: H3Event) => {
	const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
	const path = (event.path || event.node?.req?.url || 'unknown').split('?')[0]
	return `${ip}:${path}`
}

interface RedisRateLimitConfig {
	url: string
	token: string
}

const getRedisConfig = (): RedisRateLimitConfig | null => {
	const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
	const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN

	if (!url || !token) return null

	return { url: url.replace(/\/$/, ''), token }
}

const incrementRedisCounter = async (
	key: string,
	windowMs: number,
	config: RedisRateLimitConfig,
): Promise<RateLimitEntry | null> => {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS)
	try {
		const response = await fetch(`${config.url}/pipeline`, {
			signal: controller.signal,
			method: 'POST',
			headers: {
				Authorization: `Bearer ${config.token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify([
				['INCR', key],
				['PEXPIRE', key, windowMs, 'NX'],
				['PTTL', key],
			]),
		})

		if (!response.ok) return null

		const payload = (await response.json()) as Array<{
			result?: unknown
			error?: string
		}>
		const count = payload[0]?.result
		const ttlMs = payload[2]?.result

		if (typeof count !== 'number' || payload[0]?.error) return null

		return {
			count,
			resetAt: Date.now() + (typeof ttlMs === 'number' && ttlMs > 0 ? ttlMs : windowMs),
		}
	} catch (error) {
		console.warn('Rate limit store unavailable, falling back to in-memory store', error)
		return null
	} finally {
		clearTimeout(timeout)
	}
}

const incrementMemoryCounter = (
	key: string,
	windowMs: number,
	now: number,
): RateLimitEntry => {
	const entry = store.get(key)

	if (entry && entry.resetAt > now) {
		entry.count++
		return entry
	}

	if (!entry && store.size >= MAX_STORE_ENTRIES) {
		removeExpiredEntries(now)

		// Keep memory bounded even during a burst of unique, non-expired keys.
		if (store.size >= MAX_STORE_ENTRIES) {
			const oldestKey = store.keys().next().value as string | undefined
			if (oldestKey) store.delete(oldestKey)
		}
	}

	const nextEntry = {
		count: 1,
		resetAt: now + windowMs,
	}

	store.set(key, nextEntry)

	return nextEntry
}

/**
 * Rate limiter for Nitro endpoints.
 *
 * Uses a shared Upstash Redis store when UPSTASH_REDIS_REST_URL/TOKEN (or
 * Vercel KV_REST_API_URL/TOKEN) are configured, which makes the limit hold
 * across serverless instances. Falls back to an in-memory store otherwise.
 */
export const checkRateLimit = async (
	event: H3Event,
	options: RateLimitOptions,
): Promise<void> => {
	const now = Date.now()
	const key = (options.keyGenerator ?? defaultKeyGenerator)(event)
	const redisConfig = getRedisConfig()

	const redisEntry = redisConfig
		? await incrementRedisCounter(
				`${REDIS_KEY_PREFIX}${key}`,
				options.windowMs,
				redisConfig,
			)
		: null
	const entry = redisEntry ?? incrementMemoryCounter(key, options.windowMs, now)

	if (entry.count > options.maxRequests) {
		throw createError({
			statusCode: 429,
			statusMessage: 'Too Many Requests',
			message: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
		})
	}
}

/**
 * Convenience presets for common endpoint types.
 */
export const RATE_LIMIT_PRESETS = {
	/** Strict limits for write-heavy authenticated actions */
	follow: { maxRequests: 30, windowMs: 60 * 1000 },
	/** Moderate limits for search endpoints */
	search: { maxRequests: 60, windowMs: 60 * 1000 },
	/** Tight limit for server-side requests to third-party websites */
	externalFetch: { maxRequests: 20, windowMs: 60 * 1000 },
	/** Default limits for paginated read endpoints */
	paginated: { maxRequests: 120, windowMs: 60 * 1000 },
	/** Strict limit for full-catalog scan endpoints */
	catalogScan: { maxRequests: 30, windowMs: 60 * 1000 },
	/** Generous limit for cached public detail endpoints */
	publicRead: { maxRequests: 300, windowMs: 60 * 1000 },
} as const
