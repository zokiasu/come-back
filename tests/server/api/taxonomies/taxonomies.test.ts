import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSupabaseError } from '#server/utils/errorHandler'
import { taxonomyCreateSchema } from '#server/utils/schemas'
import {
	validateBody,
	validateIntegerParam,
	validateSearchParam,
} from '#server/utils/validation'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'

const loadListHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/taxonomies/[type].get')
	return module.default as (event: unknown) => Promise<unknown>
}

const loadCreateHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/taxonomies/[type].post')
	return module.default as (event: unknown) => Promise<unknown>
}

const setupGlobals = (type: string) => {
	vi.stubGlobal(
		'getRouterParam',
		vi.fn(() => type),
	)
	vi.stubGlobal(
		'getQuery',
		vi.fn(() => ({})),
	)
	vi.stubGlobal('setHeader', vi.fn())
	vi.stubGlobal(
		'readBody',
		vi.fn(async () => ({ name: 'Dance pop' })),
	)
	vi.stubGlobal('requireAdmin', vi.fn())
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal('taxonomyCreateSchema', taxonomyCreateSchema)
	vi.stubGlobal('validateBody', validateBody)
	vi.stubGlobal('validateIntegerParam', validateIntegerParam)
	vi.stubGlobal('validateSearchParam', validateSearchParam)
	vi.stubGlobal('createNotFoundError', (resource: string) =>
		createError({ statusCode: 404, statusMessage: `${resource} not found` }),
	)
}

describe('taxonomy endpoints', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('lists the requested public taxonomy with a bounded query', async () => {
		setupGlobals('music-styles')
		const taxonomyQuery = createSupabaseQueryMock({
			data: [{ name: 'Dance pop' }],
			error: null,
		})
		const from = vi.fn(() => taxonomyQuery)
		vi.stubGlobal('useServerSupabase', () => ({ from }))

		const handler = await loadListHandler()
		const result = await handler({})

		expect(from).toHaveBeenCalledWith('music_styles')
		expect(taxonomyQuery.calls).toContainEqual({
			method: 'range',
			args: [0, 499],
		})
		expect(result).toEqual([{ name: 'Dance pop' }])
	})

	it('requires admin access before creating an entry', async () => {
		setupGlobals('general-tags')
		const taxonomyQuery = createSupabaseQueryMock({
			data: { name: 'Rookie' },
			error: null,
		})
		const from = vi.fn(() => taxonomyQuery)
		vi.stubGlobal('useServerSupabase', () => ({ from }))

		const handler = await loadCreateHandler()
		const result = await handler({})

		expect(requireAdmin).toHaveBeenCalledOnce()
		expect(from).toHaveBeenCalledWith('general_tags')
		expect(taxonomyQuery.calls).toContainEqual({
			method: 'insert',
			args: [{ name: 'Dance pop' }],
		})
		expect(result).toEqual({ name: 'Rookie' })
	})

	it('rejects unknown taxonomy types without querying the database', async () => {
		setupGlobals('unknown')
		const from = vi.fn()
		vi.stubGlobal('useServerSupabase', () => ({ from }))

		const handler = await loadListHandler()
		await expect(handler({})).rejects.toMatchObject({ statusCode: 404 })
		expect(from).not.toHaveBeenCalled()
	})
})
