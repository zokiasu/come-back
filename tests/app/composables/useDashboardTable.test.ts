import { computed, nextTick, ref, watch } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadComposable = async () => {
	const modulePath = '../../../app/composables/useDashboardTable'
	return await import(modulePath)
}

const setupGlobals = () => {
	vi.stubGlobal('ref', ref)
	vi.stubGlobal('computed', computed)
	vi.stubGlobal('watch', watch)
	vi.stubGlobal('nextTick', nextTick)
	vi.stubGlobal('onMounted', (callback: () => void) => {
		void callback()
	})
}

describe('useDashboardTable', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		setupGlobals()
	})

	it('runs the initial load on mount', async () => {
		const fetch = vi.fn(async () => undefined)
		const { useDashboardTable } = await loadComposable()

		useDashboardTable({ fetch })

		expect(fetch).toHaveBeenCalledTimes(1)
	})

	it('reloads when the page changes', async () => {
		const fetch = vi.fn(async () => undefined)
		const { useDashboardTable } = await loadComposable()
		const { currentPage } = useDashboardTable({ fetch })

		currentPage.value = 2

		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
	})

	it('resets to page 1 and reloads when a filter changes', async () => {
		const fetch = vi.fn(async () => undefined)
		const filter = ref('first')
		const { useDashboardTable } = await loadComposable()
		const { currentPage } = useDashboardTable({ fetch, filterSources: [filter] })

		currentPage.value = 4
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))

		filter.value = 'second'

		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3))
		expect(currentPage.value).toBe(1)
	})

	it('resets to page 1 and reloads when the page size changes', async () => {
		const fetch = vi.fn(async () => undefined)
		const { useDashboardTable } = await loadComposable()
		const { currentPage, pageSizeValue } = useDashboardTable({ fetch })

		currentPage.value = 3
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))

		pageSizeValue.value = 50

		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3))
		expect(currentPage.value).toBe(1)
	})

	it('debounces search changes and reloads only once', async () => {
		const fetch = vi.fn(async () => undefined)
		const search = ref('')
		const { useDashboardTable } = await loadComposable()
		const { currentPage } = useDashboardTable({
			fetch,
			searchSource: search,
			debounceMs: 10,
		})

		currentPage.value = 5
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))

		search.value = 'a'
		search.value = 'ab'
		search.value = 'abc'

		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3))
		expect(currentPage.value).toBe(1)
		await new Promise((resolve) => setTimeout(resolve, 30))
		expect(fetch).toHaveBeenCalledTimes(3)
	})
	it('loads page 2 after changing a filter while already on page 1', async () => {
		const fetch = vi.fn(async () => undefined)
		const filter = ref('first')
		const { useDashboardTable } = await loadComposable()
		const { currentPage, isFilterChange } = useDashboardTable({
			fetch,
			filterSources: [filter],
		})
		filter.value = 'second'
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
		expect(isFilterChange.value).toBe(false)
		currentPage.value = 2
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3))
	})
})
