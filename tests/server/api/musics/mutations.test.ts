import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'
import { createInternalError, handleSupabaseError } from '#server/utils/errorHandler'

const MUSIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10'
const ARTIST_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const RELEASE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'

const loadPatchHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/musics/[id]/index.patch'
	const module = await import(modulePath)
	return module.default as (event: unknown) => Promise<unknown>
}

const loadDeleteHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/musics/[id]/index.delete'
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
		vi.fn(() => MUSIC_ID),
	)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('createInternalError', createInternalError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
}

describe('music mutations', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('updates a music and replaces its artist and release relations', async () => {
		const body = {
			updates: { name: 'Updated track' },
			artistIds: [ARTIST_ID],
			releaseIds: [RELEASE_ID],
		}
		setupGlobals(body)

		const updateMusicQuery = createSupabaseQueryMock({
			data: { id: MUSIC_ID, name: 'Updated track' },
			error: null,
		})
		const deleteArtistsQuery = createSupabaseQueryMock({ error: null })
		const insertArtistsQuery = createSupabaseQueryMock({ error: null })
		const deleteReleasesQuery = createSupabaseQueryMock({ error: null })
		const insertReleasesQuery = createSupabaseQueryMock({ error: null })
		const queriesByTable: Record<string, unknown[]> = {
			musics: [updateMusicQuery],
			music_artists: [deleteArtistsQuery, insertArtistsQuery],
			music_releases: [deleteReleasesQuery, insertReleasesQuery],
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
			id: MUSIC_ID,
			name: 'Updated track',
		})
		expect(insertArtistsQuery.insert).toHaveBeenCalledWith([
			{ music_id: MUSIC_ID, artist_id: ARTIST_ID },
		])
		expect(insertReleasesQuery.insert).toHaveBeenCalledWith([
			{ music_id: MUSIC_ID, release_id: RELEASE_ID, track_number: 0 },
		])
	})

	it('allows clearing relations while leaving music fields untouched', async () => {
		setupGlobals({ artistIds: [], releaseIds: [] })
		const deleteArtistsQuery = createSupabaseQueryMock({ error: null })
		const deleteReleasesQuery = createSupabaseQueryMock({ error: null })
		const from = vi.fn((table: string) => {
			if (table === 'music_artists') return deleteArtistsQuery
			if (table === 'music_releases') return deleteReleasesQuery
			throw new Error(`Unexpected table: ${table}`)
		})
		vi.stubGlobal('useServerSupabase', () => ({ from }))

		const handler = await loadPatchHandler()

		await expect(handler({})).resolves.toEqual({ id: MUSIC_ID })
		expect(deleteArtistsQuery.calls).toEqual([
			{ method: 'delete', args: [] },
			{ method: 'eq', args: ['music_id', MUSIC_ID] },
		])
		expect(deleteReleasesQuery.calls).toEqual([
			{ method: 'delete', args: [] },
			{ method: 'eq', args: ['music_id', MUSIC_ID] },
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

	it('deletes a music after removing both relation sets', async () => {
		setupGlobals(undefined)
		const deleteArtistsQuery = createSupabaseQueryMock({ error: null })
		const deleteReleasesQuery = createSupabaseQueryMock({ error: null })
		const deleteMusicQuery = createSupabaseQueryMock({ error: null })
		const queriesByTable: Record<string, unknown[]> = {
			music_artists: [deleteArtistsQuery],
			music_releases: [deleteReleasesQuery],
			musics: [deleteMusicQuery],
		}
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn((table: string) => {
				const query = queriesByTable[table]?.shift()
				if (!query) throw new Error(`Unexpected table: ${table}`)
				return query
			}),
		}))

		const handler = await loadDeleteHandler()

		await expect(handler({})).resolves.toEqual({ success: true })
		expect(deleteArtistsQuery.eq).toHaveBeenCalledWith('music_id', MUSIC_ID)
		expect(deleteReleasesQuery.eq).toHaveBeenCalledWith('music_id', MUSIC_ID)
		expect(deleteMusicQuery.eq).toHaveBeenCalledWith('id', MUSIC_ID)
	})
})
