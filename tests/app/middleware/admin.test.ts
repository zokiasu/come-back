import { createError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type AdminMiddleware = (to?: unknown, from?: unknown) => Promise<unknown>

const loadAdminMiddleware = async (): Promise<AdminMiddleware> => {
	vi.stubGlobal('defineNuxtRouteMiddleware', (handler: AdminMiddleware) => handler)
	const modulePath = '../../../app/middleware/admin'
	const module = await import(modulePath)

	return module.default as AdminMiddleware
}

const setupGlobals = ({
	supabaseUserId = null,
	userData = null,
	userStore = {},
}: {
	supabaseUserId?: string | null
	userData?: { role: string } | null
	userStore?: {
		userDataStore?: unknown
		isLoginStore?: boolean
		isAdminStore?: boolean
	}
}) => {
	const navigateTo = vi.fn((path: string) => ({ path }))

	vi.stubGlobal('useSupabaseUser', () => ({ value: { id: supabaseUserId } }))
	vi.stubGlobal('useUserStore', () => ({
		userDataStore: null,
		isLoginStore: false,
		isAdminStore: false,
		...userStore,
	}))
	vi.stubGlobal('useAuth', () => ({
		ensureAuthInitialized: vi.fn(async () => true),
		userData: {
			value: userData,
		},
	}))
	vi.stubGlobal('navigateTo', navigateTo)
	vi.stubGlobal('createError', createError)

	return { navigateTo }
}

describe('admin middleware', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('should redirect authenticated-profile-missing users when no session is available', async () => {
		const { navigateTo } = setupGlobals({
			userData: {
				role: 'USER',
			},
		})
		const middleware = await loadAdminMiddleware()

		await expect(middleware()).resolves.toEqual({
			path: '/?authError=auth_required',
		})
		expect(navigateTo).toHaveBeenCalledWith('/?authError=auth_required')
	})

	it('should reject authenticated non-admin users with 403', async () => {
		setupGlobals({
			supabaseUserId: 'user-id',
			userData: {
				role: 'USER',
			},
		})
		const middleware = await loadAdminMiddleware()

		await expect(middleware()).rejects.toMatchObject({
			statusCode: 403,
			statusMessage: 'Accès refusé. Permissions administrateur requises.',
		})
	})

	it('should allow admins restored from the persisted store', async () => {
		const { navigateTo } = setupGlobals({
			userStore: {
				userDataStore: {
					id: 'admin-id',
					role: 'ADMIN',
				},
				isLoginStore: true,
				isAdminStore: true,
			},
		})
		const middleware = await loadAdminMiddleware()

		await expect(middleware()).resolves.toBeUndefined()
		expect(navigateTo).not.toHaveBeenCalled()
	})
})
