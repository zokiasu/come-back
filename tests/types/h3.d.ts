import type { H3Error, H3Event } from 'h3'

declare global {
	function getRequestIP(
		event: H3Event,
		options?: { xForwardedFor?: boolean },
	): string | undefined
	function createError(input: {
		statusCode?: number
		statusMessage?: string
		message?: string
	}): H3Error
}

export {}
