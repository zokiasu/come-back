import { useDebounceFn } from '@vueuse/core'
import type { WatchSource } from 'vue'

interface UseDashboardTableOptions {
	fetch: () => void | Promise<void>
	filterSources?: Array<WatchSource<unknown>>
	searchSource?: WatchSource<string>
	pageSize?: number
	debounceMs?: number
}

export const toggledSortDirection = (direction: 'asc' | 'desc'): 'asc' | 'desc' =>
	direction === 'asc' ? 'desc' : 'asc'

export const useDashboardTable = (options: UseDashboardTableOptions) => {
	const currentPage = ref(1)
	const pageSizeValue = ref(options.pageSize ?? 20)
	const isFilterChange = ref(false)

	const load = async () => {
		await options.fetch()
	}

	const resetAndLoad = async () => {
		isFilterChange.value = true
		currentPage.value = 1
		await nextTick()
		// No page watcher runs when a filter changes while already on page 1.
		isFilterChange.value = false
		await load()
	}

	const debouncedResetAndLoad = useDebounceFn(resetAndLoad, options.debounceMs ?? 300)

	if (options.searchSource) {
		watch(options.searchSource, () => {
			void debouncedResetAndLoad()
		})
	}

	watch([...(options.filterSources ?? []), pageSizeValue], () => {
		void resetAndLoad()
	})

	watch(currentPage, () => {
		if (isFilterChange.value) {
			isFilterChange.value = false
			return
		}

		void load()
	})

	onMounted(() => {
		void load()
	})

	return {
		currentPage,
		pageSizeValue,
		isFilterChange,
		load,
		resetAndLoad,
	}
}
