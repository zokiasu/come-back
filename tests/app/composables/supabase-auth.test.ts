import { nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadAuthComposable = async () => {
	const modulePath = '../../../app/composables/auth/supabase-auth.composable'
	return await import(modulePath)
}

const setupEmailAuth = ({
	authError = null,
	profileReady = true,
}: {
	authError?: Error | null
	profileReady?: boolean
} = {}) => {
	const user = {
		id: 'user-id',
		email: 'person@example.com',
		user_metadata: { name: 'Person' },
	}
	const signInWithPassword = vi.fn(async () => ({
		data: { user: authError ? null : user },
		error: authError,
	}))
	const syncUserProfileFromAuthUser = vi.fn(async () => profileReady)
	const close = vi.fn()
	const refreshNuxtData = vi.fn()
	const toastAdd = vi.fn()

	vi.stubGlobal('ref', ref)
	vi.stubGlobal('nextTick', nextTick)
	vi.stubGlobal('refreshNuxtData', refreshNuxtData)
	vi.stubGlobal('useToast', () => ({ add: toastAdd }))
	vi.stubGlobal('useSupabaseClient', () => ({
		auth: { signInWithPassword },
	}))
	vi.stubGlobal('useAuth', () => ({
		syncError: ref<string | null>(null),
		syncUserProfileFromAuthUser,
	}))
	vi.stubGlobal('useAuthModal', () => ({ close }))

	return {
		close,
		refreshNuxtData,
		signInWithPassword,
		syncUserProfileFromAuthUser,
		toastAdd,
		user,
	}
}

describe('useSupabaseAuth email sign-in', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
	})

	it('signs in, synchronizes the profile and closes the modal', async () => {
		const mocks = setupEmailAuth()
		const { useSupabaseAuth } = await loadAuthComposable()
		const auth = useSupabaseAuth()

		await expect(auth.loginWithEmail('  person@example.com  ', 'secret')).resolves.toBe(
			true,
		)

		expect(mocks.signInWithPassword).toHaveBeenCalledWith({
			email: 'person@example.com',
			password: 'secret',
		})
		expect(mocks.syncUserProfileFromAuthUser).toHaveBeenCalledWith(mocks.user)
		expect(mocks.close).toHaveBeenCalledOnce()
		expect(mocks.refreshNuxtData).toHaveBeenCalledOnce()
		expect(mocks.toastAdd).toHaveBeenCalledWith(
			expect.objectContaining({ color: 'success', title: 'Signed in' }),
		)
		expect(auth.error.value).toBeNull()
		expect(auth.isLoading.value).toBe(false)
	})

	it('keeps the modal open and exposes invalid credential errors', async () => {
		const mocks = setupEmailAuth({ authError: new Error('Invalid login credentials') })
		const { useSupabaseAuth } = await loadAuthComposable()
		const auth = useSupabaseAuth()

		await expect(auth.loginWithEmail('person@example.com', 'wrong')).resolves.toBe(false)

		expect(auth.error.value).toBe('Invalid login credentials')
		expect(auth.isLoading.value).toBe(false)
		expect(mocks.syncUserProfileFromAuthUser).not.toHaveBeenCalled()
		expect(mocks.close).not.toHaveBeenCalled()
		expect(mocks.refreshNuxtData).not.toHaveBeenCalled()
	})
})
