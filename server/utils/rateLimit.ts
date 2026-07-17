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

/**
 * Simple in-memory rate limiter for Nitro endpoints.
 *
 * Best suited for single-node deployments. For multi-node/serverless
 * environments, replace the Map with a shared store (Redis, etc.).
 */
export const checkRateLimit = (event: H3Event, options: RateLimitOptions): void => {
	const now = Date.now()
	const key = (options.keyGenerator ?? defaultKeyGenerator)(event)
	const entry = store.get(key)

	if (entry && entry.resetAt > now) {
		if (entry.count >= options.maxRequests) {
			throw createError({
				statusCode: 429,
				statusMessage: 'Too Many Requests',
				message: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
			})
		}

		entry.count++
		return
	}

	if (!entry && store.size >= MAX_STORE_ENTRIES) {
		removeExpiredEntries(now)

		// Keep memory bounded even during a burst of unique, non-expired keys.
		if (store.size >= MAX_STORE_ENTRIES) {
			const oldestKey = store.keys().next().value as string | undefined
			if (oldestKey) store.delete(oldestKey)
		}
	}

	store.set(key, {
		count: 1,
		resetAt: now + options.windowMs,
	})
}

/**
 * Convenience presets for common endpoint types.
 */
export const RATE_LIMIT_PRESETS = {
	/** Strict limits for write-heavy authenticated actions */
	follow: { maxRequests: 30, windowMs: 60 * 1000 },
	/** Moderate limits for search endpoints */
	search: { maxRequests: 60, windowMs: 60 * 1000 },
	/** Default limits for paginated read endpoints */
	paginated: { maxRequests: 120, windowMs: 60 * 1000 },
} as const
