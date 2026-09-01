import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'
import { handleSupabaseError } from '#server/utils/errorHandler'

const NEWS_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10'
const ARTIST_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

const loadPatchHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/news/[id]/index.patch'
	const module = await import(modulePath)
	return module.default as (event: unknown) => Promise<unknown>
}

const loadDeleteHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/news/[id]/index.delete'
	const module = await import(modulePath)
	return module.default as (event: unknown) => Promise<unknown>
}

const setupGlobals = (body: unknown, role: 'ADMIN' | 'CONTRIBUTOR' = 'ADMIN') => {
	vi.stubGlobal(
		'requireContributor',
		vi.fn(async () => ({ id: 'user-id', role })),
	)
	vi.stubGlobal(
		'requireAdmin',
		vi.fn(async () => ({ id: 'admin-id', role: 'ADMIN' })),
	)
	vi.stubGlobal(
		'readBody',
		vi.fn(async () => body),
	)
	vi.stubGlobal(
		'validateRouteParam',
		vi.fn(() => NEWS_ID),
	)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
}

describe('news mutations', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('updates a news item and replaces its artists', async () => {
		const body = {
			updates: { message: 'Updated news' },
			artistIds: [ARTIST_ID],
		}
		setupGlobals(body)
		const updateNewsQuery = createSupabaseQueryMock({
			data: { id: NEWS_ID, message: 'Updated news' },
			error: null,
		})
		const deleteArtistsQuery = createSupabaseQueryMock({ error: null })
		const insertArtistsQuery = createSupabaseQueryMock({ error: null })
		const queriesByTable: Record<string, unknown[]> = {
			news: [updateNewsQuery],
			news_artists_junction: [deleteArtistsQuery, insertArtistsQuery],
		}
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn((table: string) => {
				const query = queriesByTable[table]?.shift()
				if (!query) throw new Error(`Unexpected table: ${table}`)
				return query
			}),
		}))

		const handler = await loadPatchHandler()

		await expect(handler({})).resolves.toEqual({
			id: NEWS_ID,
			message: 'Updated news',
		})
		expect(insertArtistsQuery.insert).toHaveBeenCalledWith([
			{ news_id: NEWS_ID, artist_id: ARTIST_ID },
		])
	})

	it('rejects verified changes from contributors before accessing Supabase', async () => {
		setupGlobals({ updates: { verified: true } }, 'CONTRIBUTOR')
		const useServerSupabase = vi.fn()
		vi.stubGlobal('useServerSupabase', useServerSupabase)

		const handler = await loadPatchHandler()

		await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
		expect(useServerSupabase).not.toHaveBeenCalled()
	})

	it('deletes a news item by id', async () => {
		setupGlobals(undefined)
		const deleteNewsQuery = createSupabaseQueryMock({ error: null })
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn(() => deleteNewsQuery),
		}))

		const handler = await loadDeleteHandler()

		await expect(handler({})).resolves.toEqual({ success: true })
		expect(deleteNewsQuery.calls).toEqual([
			{ method: 'delete', args: [] },
			{ method: 'eq', args: ['id', NEWS_ID] },
		])
	})
})
