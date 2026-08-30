import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'
import { handleSupabaseError } from '#server/utils/errorHandler'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/artists/[id]/approve.patch')

	return module.default as (event: unknown) => Promise<unknown>
}

describe('PATCH /api/artists/[id]/approve', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('requires an administrator before approving an artist', async () => {
		const requireAdmin = vi.fn(async () => ({ id: 'admin-id', role: 'ADMIN' }))
		const query = createSupabaseQueryMock({ data: null, error: null })

		vi.stubGlobal('requireAdmin', requireAdmin)
		vi.stubGlobal(
			'validateRouteParam',
			vi.fn(() => 'artist-id'),
		)
		vi.stubGlobal('useServerSupabase', () => ({ from: vi.fn(() => query) }))
		vi.stubGlobal('handleSupabaseError', handleSupabaseError)

		const handler = await loadHandler()

		await expect(handler({})).resolves.toEqual({ success: true })
		expect(requireAdmin).toHaveBeenCalledOnce()
		expect(query.update).toHaveBeenCalledWith({ verified: true })
		expect(query.eq).toHaveBeenCalledWith('id', 'artist-id')
	})

	it('does not touch Supabase when the caller is not an administrator', async () => {
		const forbidden = Object.assign(new Error('Admin access required'), {
			statusCode: 403,
			statusMessage: 'Forbidden',
		})
		const requireAdmin = vi.fn(async () => {
			throw forbidden
		})
		const useServerSupabase = vi.fn()

		vi.stubGlobal('requireAdmin', requireAdmin)
		vi.stubGlobal('useServerSupabase', useServerSupabase)

		const handler = await loadHandler()

		await expect(handler({})).rejects.toBe(forbidden)
		expect(useServerSupabase).not.toHaveBeenCalled()
	})
})
