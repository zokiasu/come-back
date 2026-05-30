import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type AuthMiddleware = (to?: unknown, from?: unknown) => Promise<unknown>

const loadAuthMiddleware = async (): Promise<AuthMiddleware> => {
	vi.stubGlobal('defineNuxtRouteMiddleware', (handler: AuthMiddleware) => handler)
	const modulePath = '../../../app/middleware/auth'
	const module = await import(modulePath)

	return module.default as AuthMiddleware
}

const setupGlobals = ({
	supabaseUserId = null,
	sessionUserId = null,
	sessionError = null,
	userData = null,
	userStore = {},
}: {
	supabaseUserId?: string | null
	sessionUserId?: string | null
	sessionError?: Error | null
	userData?: unknown
	userStore?: {
		userDataStore?: unknown
		isLoginStore?: boolean
	}
}) => {
	const navigateTo = vi.fn((path: string) => ({ path }))
	const getSession = vi.fn(async () => {
		if (sessionError) throw sessionError

		return {
			data: {
				session: sessionUserId
					? {
							user: {
								id: sessionUserId,
							},
						}
					: null,
			},
		}
	})

	vi.stubGlobal('useSupabaseUser', () => ({ value: { id: supabaseUserId } }))
	vi.stubGlobal('useSupabaseClient', () => ({
		auth: {
			getSession,
		},
	}))
	vi.stubGlobal('useUserStore', () => ({
		userDataStore: null,
		isLoginStore: false,
		...userStore,
	}))
	vi.stubGlobal('useAuth', () => ({
		ensureAuthInitialized: vi.fn(async () => true),
		userData: {
			value: userData,
		},
	}))
	vi.stubGlobal('navigateTo', navigateTo)

	return { getSession, navigateTo }
}

describe('auth middleware', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('should redirect anonymous users to the auth-required home state', async () => {
		const { navigateTo } = setupGlobals({})
		const middleware = await loadAuthMiddleware()

		await expect(middleware()).resolves.toEqual({
			path: '/?authError=auth_required',
		})
		expect(navigateTo).toHaveBeenCalledWith('/?authError=auth_required')
	})

	it('should allow users restored from Supabase session fallback', async () => {
		const { getSession, navigateTo } = setupGlobals({
			sessionUserId: 'session-user-id',
		})
		const middleware = await loadAuthMiddleware()

		await expect(middleware()).resolves.toBeUndefined()
		expect(getSession).toHaveBeenCalledOnce()
		expect(navigateTo).not.toHaveBeenCalled()
	})

	it('should allow users restored from the persisted store when session fetch fails', async () => {
		const { navigateTo } = setupGlobals({
			sessionError: new Error('session unavailable'),
			userStore: {
				userDataStore: {
					id: 'persisted-user-id',
				},
				isLoginStore: true,
			},
		})
		const middleware = await loadAuthMiddleware()

		await expect(middleware()).resolves.toBeUndefined()
		expect(navigateTo).not.toHaveBeenCalled()
	})
})
