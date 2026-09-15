import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'
import { createNotFoundError, handleSupabaseError } from '#server/utils/errorHandler'

const PROFILE_ID = '11111111-1111-1111-1111-111111111111'
const CURRENT_USER_ID = '22222222-2222-2222-2222-222222222222'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('../../../../server/api/users/[id].get')

	return module.default as (event: unknown) => Promise<unknown>
}

const setupGlobals = (routeId = PROFILE_ID) => {
	vi.stubGlobal(
		'requireAuth',
		vi.fn(async () => ({ id: CURRENT_USER_ID, email: 'me@example.com', role: 'USER' })),
	)
	vi.stubGlobal('setHeader', vi.fn())
	vi.stubGlobal(
		'validateRouteParam',
		vi.fn(() => routeId),
	)
	vi.stubGlobal('createError', createError)
	vi.stubGlobal('createNotFoundError', createNotFoundError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
}

const setupSupabase = (result: { data?: unknown; error?: unknown }) => {
	const query = createSupabaseQueryMock({
		data: result.data ?? null,
		error: result.error ?? null,
	})
	const supabase = {
		from: vi.fn(() => query),
	}

	vi.stubGlobal('useServerSupabase', () => supabase)

	return { query, supabase }
}

describe('GET /api/users/[id]', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('returns the full profile when reading the authenticated user', async () => {
		setupGlobals(CURRENT_USER_ID)
		const profile = {
			id: CURRENT_USER_ID,
			email: 'me@example.com',
			name: 'Me',
			photo_url: null,
			role: 'USER',
			created_at: '2026-01-01T00:00:00Z',
			updated_at: '2026-01-01T00:00:00Z',
		}
		const { query } = setupSupabase({ data: profile })

		const handler = await loadHandler()

		await expect(handler({})).resolves.toEqual(profile)
		expect(query.select).toHaveBeenCalledWith('*')
		expect(query.eq).toHaveBeenCalledWith('id', CURRENT_USER_ID)
	})

	it('never exposes the email when reading another user profile', async () => {
		setupGlobals(PROFILE_ID)
		const publicProfile = {
			id: PROFILE_ID,
			name: 'Someone',
			photo_url: null,
			role: 'USER',
			created_at: '2026-01-01T00:00:00Z',
		}
		const { query } = setupSupabase({ data: publicProfile })

		const handler = await loadHandler()
		const result = await handler({})

		expect(query.select).toHaveBeenCalledWith('id, name, photo_url, role, created_at')
		expect(query.select).not.toHaveBeenCalledWith('*')
		expect(result).toEqual(publicProfile)
		expect(result).not.toHaveProperty('email')
	})

	it('throws a 404 when the profile does not exist', async () => {
		setupGlobals(PROFILE_ID)
		setupSupabase({ error: { code: 'PGRST116', message: 'no rows' } })

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 404,
		})
	})
})
