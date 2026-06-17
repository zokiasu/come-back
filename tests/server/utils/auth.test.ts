import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serverSupabaseUser } from '../../mocks/supabaseServer'

type DbUser = {
	id: string
	email: string
	role: 'USER' | 'CONTRIBUTOR' | 'ADMIN'
}

type AuthModule = {
	getAuthenticatedUser: (event: never) => Promise<DbUser | null>
	requireAdmin: (event: never) => Promise<DbUser>
	requireAuth: (event: never) => Promise<DbUser>
	requireContributor: (event: never) => Promise<DbUser>
	requireCronSecret: (event: never) => void
}

const loadAuthModule = async (): Promise<AuthModule> => {
	const modulePath = '../../../server/utils/auth'
	const module = await import(modulePath)

	return module as AuthModule
}

const createUsersQuery = (dbUser: DbUser | null, dbError: unknown = null) => {
	const query = {
		select: vi.fn(() => query),
		eq: vi.fn(() => query),
		single: vi.fn(async () => ({ data: dbUser, error: dbError })),
	}

	return query
}

const setupSupabase = ({
	dbUser,
	dbError = null,
	authUser = null,
	authError = null,
}: {
	dbUser: DbUser | null
	dbError?: unknown
	authUser?: { id: string } | null
	authError?: unknown
}) => {
	const usersQuery = createUsersQuery(dbUser, dbError)
	const supabase = {
		auth: {
			getUser: vi.fn(async () => ({
				data: { user: authUser },
				error: authError,
			})),
		},
		from: vi.fn(() => usersQuery),
	}

	vi.stubGlobal('useServerSupabase', () => supabase)

	return { supabase, usersQuery }
}

const setupHeader = (authorization?: string) => {
	vi.stubGlobal(
		'getHeader',
		vi.fn(() => authorization),
	)
}

describe('server auth utils', () => {
	beforeEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.stubGlobal('createError', createError)
		setupHeader()
	})

	describe('getAuthenticatedUser', () => {
		it('should authenticate a Bearer token and fetch the database role', async () => {
			const { getAuthenticatedUser } = await loadAuthModule()
			setupHeader('Bearer valid-token')
			const { supabase, usersQuery } = setupSupabase({
				authUser: { id: 'auth-user-id' },
				dbUser: {
					id: 'auth-user-id',
					email: 'admin@example.com',
					role: 'ADMIN',
				},
			})

			const user = await getAuthenticatedUser({} as never)

			expect(supabase.auth.getUser).toHaveBeenCalledWith('valid-token')
			expect(supabase.from).toHaveBeenCalledWith('users')
			expect(usersQuery.eq).toHaveBeenCalledWith('id', 'auth-user-id')
			expect(user).toEqual({
				id: 'auth-user-id',
				email: 'admin@example.com',
				role: 'ADMIN',
			})
		})

		it('should fall back to the Supabase session user when no Bearer token exists', async () => {
			const { getAuthenticatedUser } = await loadAuthModule()
			vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'session-user-id' })
			setupSupabase({
				dbUser: {
					id: 'session-user-id',
					email: 'user@example.com',
					role: 'USER',
				},
			})

			const user = await getAuthenticatedUser({} as never)

			expect(serverSupabaseUser).toHaveBeenCalledOnce()
			expect(user?.id).toBe('session-user-id')
			expect(user?.role).toBe('USER')
		})

		it('should return null when token verification fails', async () => {
			const { getAuthenticatedUser } = await loadAuthModule()
			setupHeader('Bearer invalid-token')
			const { supabase } = setupSupabase({
				authUser: null,
				authError: new Error('invalid token'),
				dbUser: null,
			})

			const user = await getAuthenticatedUser({} as never)

			expect(user).toBeNull()
			expect(supabase.from).not.toHaveBeenCalled()
		})
	})

	describe('role guards', () => {
		it('should throw 401 when authentication is missing', async () => {
			const { requireAuth } = await loadAuthModule()
			vi.mocked(serverSupabaseUser).mockResolvedValue(null)
			setupSupabase({ dbUser: null })

			await expect(requireAuth({} as never)).rejects.toMatchObject({
				statusCode: 401,
				statusMessage: 'Unauthorized',
			})
		})

		it('should reject non-admin users from admin-only actions', async () => {
			const { requireAdmin } = await loadAuthModule()
			vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-id' })
			setupSupabase({
				dbUser: {
					id: 'user-id',
					email: 'user@example.com',
					role: 'USER',
				},
			})

			await expect(requireAdmin({} as never)).rejects.toMatchObject({
				statusCode: 403,
				statusMessage: 'Forbidden',
			})
		})

		it('should accept contributors and admins for contributor actions', async () => {
			const { requireContributor } = await loadAuthModule()
			vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'contributor-id' })
			setupSupabase({
				dbUser: {
					id: 'contributor-id',
					email: 'contributor@example.com',
					role: 'CONTRIBUTOR',
				},
			})

			await expect(requireContributor({} as never)).resolves.toMatchObject({
				id: 'contributor-id',
				role: 'CONTRIBUTOR',
			})
		})
	})

	describe('requireCronSecret', () => {
		it('should reject requests when CRON_SECRET is not configured', async () => {
			const { requireCronSecret } = await loadAuthModule()
			vi.stubGlobal('useRuntimeConfig', () => ({}))

			expect(() => requireCronSecret({} as never)).toThrowError(
				expect.objectContaining({
					statusCode: 500,
					statusMessage: 'Internal Server Error',
				}),
			)
		})

		it('should reject requests with an invalid Bearer token', async () => {
			const { requireCronSecret } = await loadAuthModule()
			vi.stubGlobal('useRuntimeConfig', () => ({ CRON_SECRET: 'secret' }))
			setupHeader('Bearer wrong')

			expect(() => requireCronSecret({} as never)).toThrowError(
				expect.objectContaining({
					statusCode: 401,
					statusMessage: 'Unauthorized',
				}),
			)
		})

		it('should accept the configured Bearer token', async () => {
			const { requireCronSecret } = await loadAuthModule()
			vi.stubGlobal('useRuntimeConfig', () => ({ CRON_SECRET: 'secret' }))
			setupHeader('Bearer secret')

			expect(() => requireCronSecret({} as never)).not.toThrow()
		})
	})
})
