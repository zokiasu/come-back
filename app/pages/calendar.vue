<script setup lang="ts">
	import { useWindowSize } from '@vueuse/core'
	import { useSupabaseRelease } from '~/composables/Supabase/useSupabaseRelease'

	type CalendarRelease = {
		id: string
		name: string
		type: 'SINGLE' | 'EP' | 'ALBUM' | 'MIXTAPE' | 'COMPILATION' | null
		date: string | null
		image: string | null
		id_youtube_music: string | null
		artists?: Array<{ id: string; name: string }>
	}
	type ArtistLike = { id: string; name: string }
	type ReleaseTypeFilter = 'ALL' | 'ALBUM' | 'EP' | 'SINGLE'

	const { getReleasesByMonthAndYear } = useSupabaseRelease()
	const { width: windowWidth } = useWindowSize()

	const latestYear = new Date().getFullYear()
	const monthList = [
		{ minify: 'Jan', original: 'January' },
		{ minify: 'Feb', original: 'February' },
		{ minify: 'Mar', original: 'March' },
		{ minify: 'Apr', original: 'April' },
		{ minify: 'May', original: 'May' },
		{ minify: 'Jun', original: 'June' },
		{ minify: 'Jul', original: 'July' },
		{ minify: 'Aug', original: 'August' },
		{ minify: 'Sep', original: 'September' },
		{ minify: 'Oct', original: 'October' },
		{ minify: 'Nov', original: 'November' },
		{ minify: 'Dec', original: 'December' },
	]

	const currentYear = ref<number>(latestYear)
	const currentMonth = ref<number>(new Date().getMonth())
	const selectedReleaseType = ref<ReleaseTypeFilter>('ALL')
	const releases = ref<CalendarRelease[]>([])
	const loading = ref<boolean>(true)
	const pageError = ref<string | null>(null)

	const yearList = computed(() =>
		Array.from({ length: latestYear - 2020 + 1 }, (_, index) => 2020 + index),
	)

	const displayedReleases = computed(() => {
		if (selectedReleaseType.value === 'ALL') {
			return releases.value
		}

		return releases.value.filter((release) => release.type === selectedReleaseType.value)
	})

	const releaseLaneCount = computed(() => {
		if (windowWidth.value >= 1280) return 8
		if (windowWidth.value >= 1024) return 6
		if (windowWidth.value >= 768) return 4
		if (windowWidth.value >= 640) return 3
		return 2
	})

	const releaseGridGap = computed(() => {
		return windowWidth.value >= 768 ? 14 : 8
	})

	const releaseVirtualizeOptions = computed(() => ({
		lanes: releaseLaneCount.value,
		gap: releaseGridGap.value,
		overscan: releaseLaneCount.value * 6,
		estimateSize: () => (windowWidth.value >= 1024 ? 315 : 285),
		getItemKey: (index: number) => displayedReleases.value[index]?.id ?? index,
	}))

	const normalizeReleases = (items: unknown[]): CalendarRelease[] => {
		return items.map((item) => {
			const record = item as Record<string, unknown>
			const artists = Array.isArray(record.artists)
				? record.artists
						.filter(
							(artist): artist is ArtistLike =>
								typeof artist === 'object' &&
								artist !== null &&
								typeof (artist as { id?: unknown }).id === 'string' &&
								typeof (artist as { name?: unknown }).name === 'string',
						)
						.map((artist) => ({ id: artist.id, name: artist.name }))
				: undefined

			return {
				id: String(record.id ?? ''),
				name: String(record.name ?? ''),
				type: (record.type as CalendarRelease['type']) ?? null,
				date: (record.date as string | null) ?? null,
				image: (record.image as string | null) ?? null,
				id_youtube_music: (record.id_youtube_music as string | null) ?? null,
				artists,
			}
		})
	}

	const sortReleases = (items: CalendarRelease[]) => {
		return [...items].sort((a, b) => {
			if (a.date === b.date) {
				return a.name.localeCompare(b.name)
			}

			return new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
		})
	}

	const countReleasesByType = (type: 'ALBUM' | 'EP' | 'SINGLE'): number => {
		let count = 0

		for (const release of releases.value) {
			if (release.type === type) {
				count += 1
			}
		}

		return count
	}

	const setReleaseTypeFilter = (type: ReleaseTypeFilter) => {
		selectedReleaseType.value = type
	}

	const selectYear = (year: number) => {
		if (currentYear.value === year) return

		currentYear.value = year
		selectedReleaseType.value = 'ALL'
	}

	const selectMonth = (monthIndex: number) => {
		if (currentMonth.value === monthIndex) return

		currentMonth.value = monthIndex
		selectedReleaseType.value = 'ALL'
	}

	const loadReleases = async () => {
		loading.value = true
		pageError.value = null

		try {
			const result = await getReleasesByMonthAndYear(currentMonth.value, currentYear.value)
			const normalizedReleases = Array.isArray(result) ? normalizeReleases(result) : []
			releases.value = sortReleases(normalizedReleases)
		} catch (error) {
			releases.value = []
			pageError.value = 'Unable to load releases for this period. Please retry.'

			console.error('[Calendar] Failed to load releases', {
				error,
				month: currentMonth.value,
				year: currentYear.value,
			})
		} finally {
			loading.value = false
		}
	}

	const retryLoadReleases = async () => {
		await loadReleases()
	}

	onMounted(async () => {
		await loadReleases()
	})

	watch([currentYear, currentMonth], async ([nextYear, nextMonth], [prevYear, prevMonth]) => {
		if (nextYear === prevYear && nextMonth === prevMonth) return

		await loadReleases()
	})

	useHead({
		title: 'Calendar Releases',
		meta: [
			{
				name: 'description',
				content: 'Calendar Releases',
			},
		],
	})
</script>

<template>
	<div
		id="calendarPage"
		class="container mx-auto h-fit min-h-screen w-full space-y-3 p-3 md:p-5"
	>
		<!-- Period Selector -->
		<div>
			<!-- Year Selector -->
			<div
				class="remove-scrollbar scrollBarLight flex w-full snap-x snap-mandatory gap-1 overflow-x-auto pb-1 text-xs font-semibold"
			>
				<button
					v-for="year in yearList"
					:id="String(year)"
					:key="year"
					class="h-full w-full snap-start rounded px-4 py-2.5"
					:class="currentYear == year ? 'bg-cb-primary-900' : 'bg-cb-quaternary-950'"
					@click="selectYear(year)"
				>
					{{ year }}
				</button>
			</div>
			<!-- Month Selector -->
			<div
				v-if="yearList.length"
				class="remove-scrollbar scrollBarLight flex w-full snap-x snap-mandatory gap-1 overflow-x-auto pb-1 text-xs font-semibold"
			>
				<button
					v-for="(month, index) in monthList"
					:id="month.original"
					:key="month.original"
					class="h-full w-full snap-start rounded px-4 py-2.5"
					:class="currentMonth == index ? 'bg-cb-primary-900' : 'bg-cb-quaternary-950'"
					@click="selectMonth(index)"
				>
					<p class="block md:hidden">{{ month.minify }}</p>
					<p class="hidden md:block">{{ month.original }}</p>
				</button>
			</div>
		</div>
		<!-- Stats -->
		<div class="border-cb-quaternary-950 space-y-2 border-y-2 py-3 text-xs">
			<!-- <p class="text-base font-semibold text-center">
        {{ monthList[currentMonth].original }} {{ currentYear }}'s stats
      </p> -->
			<div class="grid grid-cols-4 items-center justify-center gap-1 lg:gap-5">
				<button
					class="bg-cb-primary-900 flex h-full w-full flex-col items-center justify-center rounded px-2 py-1"
					:class="
						selectedReleaseType === 'ALL'
							? 'bg-cb-primary-900'
							: 'bg-cb-quaternary-950'
					"
					@click="setReleaseTypeFilter('ALL')"
				>
					Total releases
					<span class="text-base font-bold">{{ releases.length }}</span>
				</button>
				<button
					class="bg-cb-primary-900 flex h-full w-full flex-col items-center justify-center rounded px-2 py-1"
					:class="
						selectedReleaseType === 'ALBUM'
							? 'bg-cb-primary-900'
							: 'bg-cb-quaternary-950'
					"
					@click="setReleaseTypeFilter('ALBUM')"
				>
					Total albums
					<span class="text-base font-bold">
						{{ countReleasesByType('ALBUM') }}
					</span>
				</button>
				<button
					class="bg-cb-primary-900 flex h-full w-full flex-col items-center justify-center rounded px-2 py-1"
					:class="
						selectedReleaseType === 'EP'
							? 'bg-cb-primary-900'
							: 'bg-cb-quaternary-950'
					"
					@click="setReleaseTypeFilter('EP')"
				>
					Total EPs
					<span class="text-base font-bold">
						{{ countReleasesByType('EP') }}
					</span>
				</button>
				<button
					class="bg-cb-primary-900 flex h-full w-full flex-col items-center justify-center rounded px-2 py-1"
					:class="
						selectedReleaseType === 'SINGLE'
							? 'bg-cb-primary-900'
							: 'bg-cb-quaternary-950'
					"
					@click="setReleaseTypeFilter('SINGLE')"
				>
					Total singles
					<span class="text-base font-bold">
						{{ countReleasesByType('SINGLE') }}
					</span>
				</button>
			</div>
		</div>
		<!-- <p class="text-sm italic text-cb-primary-900">Some troubles have been noticed with our release recovery API and are working to resolve them quickly. We apologize for the inconvenience.</p> -->
		<!-- Releases -->
		<div class="space-y-3">
			<div class="flex items-center justify-between gap-3">
				<div>
					<p class="text-sm font-semibold">
						{{ monthList[currentMonth]?.original }} {{ currentYear }}
					</p>
					<p class="text-cb-tertiary-500 text-xs">
						{{ displayedReleases.length }} release{{ displayedReleases.length > 1 ? 's' : '' }}
						displayed
					</p>
				</div>
				<UButton
					v-if="pageError"
					type="button"
					color="error"
					variant="soft"
					:loading="loading"
					@click="retryLoadReleases"
				>
					Retry
				</UButton>
			</div>

			<div
				v-if="pageError"
				class="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100"
			>
				{{ pageError }}
			</div>

			<SkeletonDefault v-if="loading" text="Loading..." class="h-48 w-full rounded-lg" />

			<div
				v-else-if="displayedReleases.length === 0"
				class="bg-cb-quaternary-950 rounded-xl p-8 text-center"
			>
				<p class="font-medium">No releases found</p>
				<p class="text-cb-tertiary-500 mt-1 text-sm">
					Try another month or reset the release type filter.
				</p>
			</div>

			<div v-else class="h-[min(72vh,56rem)]">
				<UScrollArea
					:items="displayedReleases"
					:virtualize="releaseVirtualizeOptions"
					class="h-full"
					:ui="{
						viewport: 'h-full w-full',
						item: 'min-w-0',
					}"
				>
					<template #default="{ item: release }">
						<CardObject
							v-if="release"
							:artist-id="release.artists?.[0]?.id ?? ''"
							:main-title="release.name"
							:sub-title="release.artists?.[0]?.name"
							:image="release.image ?? undefined"
							:release-date="release.date ?? undefined"
							:release-type="release.type ?? undefined"
							:object-link="`/release/${release.id}`"
							date-always-display
							class="!min-w-0 !w-full"
						/>
					</template>
				</UScrollArea>
			</div>
		</div>
		<div
			v-if="!loading && !pageError && displayedReleases.length > 24"
			class="w-full py-2 text-center"
		>
			<p class="text-cb-tertiary-500 text-xs">
				Virtualized list enabled for smoother scrolling.
			</p>
		</div>
	</div>
</template>
