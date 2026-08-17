import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSupabaseError } from '#server/utils/errorHandler'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/companies/[id]/complete.get')

	return module.default as (event: unknown) => Promise<unknown>
}

const setupSupabase = (results: Record<string, { data?: unknown; error?: unknown }>) => {
	const queries: Record<string, ReturnType<typeof createSupabaseQueryMock>> = {
		companies: createSupabaseQueryMock({
			data: results.companies?.data ?? null,
			error: results.companies?.error ?? null,
		}),
		artist_companies: createSupabaseQueryMock({ data: [], error: null }),
	}
	const supabase = {
		from: vi.fn((table: string) => queries[table]),
	}

	vi.stubGlobal('useServerSupabase', () => supabase)

	return { queries, supabase }
}

const setupGlobals = () => {
	const setHeader = vi.fn()

	vi.stubGlobal('setHeader', setHeader)
	vi.stubGlobal('getRouterParam', vi.fn(() => 'company-id'))
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)

	return { setHeader }
}

describe('GET /api/companies/[id]/complete', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('only exposes verified companies with verified artists', async () => {
		setupGlobals()
		const { queries } = setupSupabase({
			companies: {
				data: { id: 'company-id', name: 'SM Entertainment', verified: true },
			},
		})

		const handler = await loadHandler()
		const result = await handler({})

		expect(queries.companies.eq).toHaveBeenCalledWith('id', 'company-id')
		expect(queries.companies.eq).toHaveBeenCalledWith('verified', true)
		expect(queries.artist_companies.eq).toHaveBeenCalledWith('company_id', 'company-id')
		expect(queries.artist_companies.eq).toHaveBeenCalledWith('artist.verified', true)

		const payload = result as { company: { id: string; name: string }; company_artists: unknown[] }
		expect(payload.company.id).toBe('company-id')
		expect(payload.company_artists).toEqual([])
	})

	it('returns 404 for an unverified (or missing) company', async () => {
		setupGlobals()
		setupSupabase({
			companies: {
				data: null,
				error: { code: 'PGRST116', message: 'no rows', details: '', hint: '' },
			},
		})

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 404,
			statusMessage: 'Company not found',
		})
	})
})
