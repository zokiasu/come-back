import { computed, readonly, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loadComposable = async () => {
	const modulePath = '../../../app/composables/useYoutubeMusicIdCheck'
	return await import(modulePath)
}

describe('useYoutubeMusicIdCheck', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.useFakeTimers()
		vi.stubGlobal('ref', ref)
		vi.stubGlobal('computed', computed)
		vi.stubGlobal('readonly', readonly)
		vi.stubGlobal('useApiAuthHeaders', () => ({
			getAuthHeaders: () => ({ Authorization: 'Bearer token' }),
		}))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('marks an available id after the debounced check completes', async () => {
		vi.stubGlobal(
			'$fetch',
			vi.fn(async () => ({ status: 'available' })),
		)
		const { useYoutubeMusicIdCheck } = await loadComposable()
		const check = useYoutubeMusicIdCheck()

		check.checkId('valid-id')
		await vi.advanceTimersByTimeAsync(500)

		expect(check.status.value).toBe('available')
		expect(check.isBlocked.value).toBe(false)
	})

	it('ignores a stale response after the selected id is reset', async () => {
		let resolveRequest: ((value: { status: 'available' }) => void) | undefined
		vi.stubGlobal(
			'$fetch',
			vi.fn(
				() =>
					new Promise<{ status: 'available' }>((resolve) => {
						resolveRequest = resolve
					}),
			),
		)
		const { useYoutubeMusicIdCheck } = await loadComposable()
		const check = useYoutubeMusicIdCheck()

		check.checkId('first-id')
		await vi.advanceTimersByTimeAsync(500)
		expect(check.status.value).toBe('checking')

		check.reset()
		resolveRequest?.({ status: 'available' })
		await Promise.resolve()
		await Promise.resolve()

		expect(check.status.value).toBe('idle')
		expect(check.message.value).toBeNull()
	})
})
