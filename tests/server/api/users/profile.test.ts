import { createError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'
import { createBadRequestError, handleSupabaseError } from '#server/utils/errorHandler'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/users/profile.put')

	return module.default as (event: unknown) => Promise<unknown>
}

const setupGlobals = (body: unknown) => {
	vi.stubGlobal(
		'requireAuth',
		vi.fn(async () => ({ id: 'user-id', role: 'USER' })),
	)
	vi.stubGlobal(
		'readBody',
		vi.fn(async () => body),
	)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('createBadRequestError', createBadRequestError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
}

describe('PUT /api/users/profile', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-08-28T12:00:00Z'))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('updates only the authenticated profile fields allow-listed by the server', async () => {
		setupGlobals({ name: 'Updated name', photo_url: 'https://example.com/photo.jpg' })
		const savedUser = {
			id: 'user-id',
			name: 'Updated name',
			photo_url: 'https://example.com/photo.jpg',
			role: 'USER',
		}
		const query = createSupabaseQueryMock({ data: savedUser, error: null })
		vi.stubGlobal('useServerSupabase', () => ({ from: vi.fn(() => query) }))

		const handler = await loadHandler()

		await expect(handler({})).resolves.toEqual(savedUser)
		expect(query.update).toHaveBeenCalledWith({
			name: 'Updated name',
			photo_url: 'https://example.com/photo.jpg',
			updated_at: '2026-08-28T12:00:00.000Z',
		})
		expect(query.eq).toHaveBeenCalledWith('id', 'user-id')
	})

	it('rejects attempts to mass-assign role or email', async () => {
		setupGlobals({
			name: 'Attacker',
			photo_url: null,
			role: 'ADMIN',
			email: 'attacker@example.com',
		})
		const useServerSupabase = vi.fn()
		vi.stubGlobal('useServerSupabase', useServerSupabase)

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 400,
			statusMessage: 'Bad Request',
		})
		expect(useServerSupabase).not.toHaveBeenCalled()
	})
})
