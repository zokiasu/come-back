import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../server/api/get-page-title.get')

	return module.default as (event: unknown) => Promise<unknown>
}

const setupGlobals = (url: unknown) => {
	const checkRateLimit = vi.fn()
	const preset = { maxRequests: 20, windowMs: 60_000 }

	vi.stubGlobal(
		'getQuery',
		vi.fn(() => ({ url })),
	)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('checkRateLimit', checkRateLimit)
	vi.stubGlobal('RATE_LIMIT_PRESETS', { externalFetch: preset })

	return { checkRateLimit, preset }
}

describe('GET /api/get-page-title', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('rate limits third-party fetches and returns a decoded title', async () => {
		const { checkRateLimit, preset } = setupGlobals('https://youtube.com/watch?v=1')
		const fetchMock = vi.fn(
			async () =>
				new Response('<html><title>K&amp;Pop</title></html>', {
					status: 200,
					headers: { 'content-type': 'text/html' },
				}),
		)
		vi.stubGlobal('fetch', fetchMock)

		const handler = await loadHandler()

		await expect(handler({})).resolves.toEqual({ title: 'K&Pop', source: 'title' })
		expect(checkRateLimit).toHaveBeenCalledWith({}, preset)
		expect(fetchMock).toHaveBeenCalledOnce()
	})

	it.each(['file:///etc/passwd', 'javascript:alert(1)'])(
		'preserves the client error for a forbidden protocol: %s',
		async (url) => {
			setupGlobals(url)
			const fetchMock = vi.fn()
			vi.stubGlobal('fetch', fetchMock)

			const handler = await loadHandler()

			await expect(handler({})).rejects.toMatchObject({
				statusCode: 400,
				statusMessage: 'Only HTTP and HTTPS URLs are allowed',
			})
			expect(fetchMock).not.toHaveBeenCalled()
		},
	)

	it('rejects non-string query parameters before fetching', async () => {
		setupGlobals(['https://youtube.com', 'https://example.com'])
		const fetchMock = vi.fn()
		vi.stubGlobal('fetch', fetchMock)

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 400,
			statusMessage: 'URL parameter is required',
		})
		expect(fetchMock).not.toHaveBeenCalled()
	})
})
