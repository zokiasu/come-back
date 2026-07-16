import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'
import { createBadRequestError, handleSupabaseError } from '#server/utils/errorHandler'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/releases/[id]/index.patch'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

const setupGlobals = (body: unknown, routeId = 'release-id') => {
	vi.stubGlobal(
		'requireContributor',
		vi.fn(async () => undefined),
	)
	vi.stubGlobal(
		'readBody',
		vi.fn(async () => body),
	)
	vi.stubGlobal(
		'validateRouteParam',
		vi.fn(() => routeId),
	)
	vi.stubGlobal('createBadRequestError', createBadRequestError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
}

describe('PATCH /api/releases/:id', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('should reject missing request bodies', async () => {
		setupGlobals(null)
		vi.stubGlobal('useServerSupabase', () => ({ from: vi.fn() }))

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 400,
		})
	})

	it('should update the release and replace artists and platform links', async () => {
		const body = {
			updates: {
				name: 'Updated Release',
			},
			artistIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'],
			platformLinks: [{ name: 'spotify', link: 'https://example.com' }],
		}
		const updatedRelease = {
			id: 'release-id',
			name: 'Updated Release',
		}
		setupGlobals(body)

		const updateReleaseQuery = createSupabaseQueryMock({
			data: updatedRelease,
			error: null,
		})
		const deleteArtistsQuery = createSupabaseQueryMock({ error: null })
		const insertArtistsQuery = createSupabaseQueryMock({ error: null })
		const deletePlatformLinksQuery = createSupabaseQueryMock({ error: null })
		const insertPlatformLinksQuery = createSupabaseQueryMock({ error: null })
		const queriesByTable: Record<string, unknown[]> = {
			releases: [updateReleaseQuery],
			artist_releases: [deleteArtistsQuery, insertArtistsQuery],
			release_platform_links: [deletePlatformLinksQuery, insertPlatformLinksQuery],
		}
		const supabase = {
			from: vi.fn((table: string) => {
				const query = queriesByTable[table]?.shift()

				if (!query) throw new Error(`Unexpected table: ${table}`)

				return query
			}),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()
		const result = await handler({})

		expect(result).toEqual(updatedRelease)
		expect(updateReleaseQuery.calls).toEqual([
			{ method: 'update', args: [body.updates] },
			{ method: 'eq', args: ['id', 'release-id'] },
			{ method: 'select', args: [] },
		])
		expect(updateReleaseQuery.single).toHaveBeenCalledOnce()
		expect(deleteArtistsQuery.calls).toEqual([
			{ method: 'delete', args: [] },
			{ method: 'eq', args: ['release_id', 'release-id'] },
		])
		expect(insertArtistsQuery.calls).toEqual([
			{
				method: 'insert',
				args: [
					[
						{
							release_id: 'release-id',
							artist_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
							is_primary: true,
						},
						{
							release_id: 'release-id',
							artist_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
							is_primary: false,
						},
					],
				],
			},
		])
		expect(deletePlatformLinksQuery.calls).toEqual([
			{ method: 'delete', args: [] },
			{ method: 'eq', args: ['release_id', 'release-id'] },
		])
		expect(insertPlatformLinksQuery.calls).toEqual([
			{
				method: 'insert',
				args: [
					[
						{
							name: 'spotify',
							link: 'https://example.com',
							release_id: 'release-id',
						},
					],
				],
			},
		])
	})

	it('should return the release id when only relations are updated', async () => {
		setupGlobals({ artistIds: [] })

		const deleteArtistsQuery = createSupabaseQueryMock({ error: null })
		const supabase = {
			from: vi.fn(() => deleteArtistsQuery),
		}
		vi.stubGlobal('useServerSupabase', () => supabase)

		const handler = await loadHandler()

		await expect(handler({})).resolves.toEqual({ id: 'release-id' })
		expect(supabase.from).toHaveBeenCalledWith('artist_releases')
	})
})
