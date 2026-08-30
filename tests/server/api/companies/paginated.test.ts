import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSupabaseError } from '#server/utils/errorHandler'
import {
	validateIntegerParam,
	validateOrderBy,
	validateOrderDirection,
	validateSearchParam,
} from '#server/utils/validation'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/companies/paginated.get')

	return module.default as (event: unknown) => Promise<unknown>
}

const setupGlobals = (query: Record<string, string> = {}) => {
	vi.stubGlobal(
		'getQuery',
		vi.fn(() => query),
	)
	vi.stubGlobal('setHeader', vi.fn())
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal('validateIntegerParam', validateIntegerParam)
	vi.stubGlobal('validateOrderBy', validateOrderBy)
	vi.stubGlobal('validateOrderDirection', validateOrderDirection)
	vi.stubGlobal('validateSearchParam', validateSearchParam)
	vi.stubGlobal('createBadRequestError', (message: string) =>
		createError({ statusCode: 400, statusMessage: message }),
	)
	vi.stubGlobal('requireContributor', vi.fn())
}

describe('GET /api/companies/paginated', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('defaults public listings to verified companies', async () => {
		setupGlobals({ page: '1', limit: '20' })
		const companiesQuery = createSupabaseQueryMock({
			data: [{ id: 'company-id', name: 'HYBE', verified: true }],
			count: 1,
			error: null,
		})
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn(() => companiesQuery),
		}))

		const handler = await loadHandler()
		const result = await handler({})

		expect(companiesQuery.calls).toContainEqual({
			method: 'eq',
			args: ['verified', true],
		})
		expect(requireContributor).not.toHaveBeenCalled()
		expect(result).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 })
	})

	it('requires contributor access for unverified listings', async () => {
		setupGlobals({ verified: 'false' })
		const companiesQuery = createSupabaseQueryMock({ data: [], count: 0, error: null })
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn(() => companiesQuery),
		}))

		const handler = await loadHandler()
		await handler({})

		expect(requireContributor).toHaveBeenCalledOnce()
		expect(companiesQuery.calls).toContainEqual({
			method: 'eq',
			args: ['verified', false],
		})
	})

	it('rejects malformed verification filters', async () => {
		setupGlobals({ verified: 'yes' })
		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
	})
})
