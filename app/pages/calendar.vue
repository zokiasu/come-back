<script setup lang="ts">
	import type { Release } from '~/types'
	import { useWindowScroll } from '@vueuse/core'
	import { useSupabaseRelease } from '~/composables/Supabase/useSupabaseRelease'

	const { getReleasesByMonthAndYear } = useSupabaseRelease()

	const backTop = useTemplateRef('backTop')
	const yearList = ref<number[]>([])
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
	const currentYear = ref<number>(new Date().getFullYear())
	const currentMonth = ref<number>(new Date().getMonth())
	const onlyAlbums = ref<boolean>(false)
	const onlyEps = ref<boolean>(false)
	const onlySingles = ref<boolean>(false)
	const releases = ref<Release[]>([])
	const loading = ref<boolean>(true)

	// Utiliser le composable Nuxt pour le scroll
	const { y: scrollY } = useWindowScroll()

	// Watcher réactif pour le bouton back-to-top
	watch(scrollY, (newScrollY) => {
		if (import.meta.client && backTop.value) {
			if (newScrollY > 50) {
				backTop.value.classList.remove('hidden')
			} else {
				backTop.value.classList.add('hidden')
			}
		}
	})

	const switchTypeFilter = async (type: string) => {
		if (type === 'ALBUM') {
			onlyAlbums.value = true
			onlyEps.value = false
			onlySingles.value = false
		} else if (type === 'EP') {
			onlyAlbums.value = false
			onlyEps.value = true
			onlySingles.value = false
		} else if (type === 'SINGLE') {
			onlyAlbums.value = false
			onlyEps.value = false
			onlySingles.value = true
		} else {
			onlyAlbums.value = false
			onlyEps.value = false
			onlySingles.value = false
		}
	}

	const releasesDisplayed = computed(() => {
		if (onlyAlbums.value) {
			return releases.value.filter((release) => release.type === 'ALBUM')
		} else if (onlyEps.value) {
			return releases.value.filter((release) => release.type === 'EP')
		} else if (onlySingles.value) {
			return releases.value.filter((release) => release.type === 'SINGLE')
		} else {
			return releases.value
		}
	})

	// function backtotop to id calendarPage
	const backToTop = () => {
		const nuxtElement = document.getElementById('__nuxt')
		if (nuxtElement) {
			nuxtElement.scrollIntoView({ behavior: 'smooth' })
		}
	}

	// Initialiser la liste des années et charger les données
	onMounted(async () => {
		for (let year = 2020; year <= currentYear.value; year++) {
			yearList.value.push(year)
		}

		await getReleasesByMonthAndYear(currentMonth.value, currentYear.value).then((res) => {
			loading.value = false
			releases.value = res.sort((a, b) => {
				return new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
			})
		})
	})

	// Watcher pour les changements de mois/année
	watch([currentYear, currentMonth], async () => {
		releases.value = await getReleasesByMonthAndYear(
			currentMonth.value,
			currentYear.value,
		)

		releases.value = releases.value.sort((a, b) => {
			if (a.date === b.date) {
				return a.name.localeCompare(b.name)
			}
			return new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
		})
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
					@click="((currentYear = year), switchTypeFilter('ALL'))"
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
					@click="((currentMonth = index), switchTypeFilter('ALL'))"
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
						!onlyAlbums && !onlyEps && !onlySingles
							? 'bg-cb-primary-900'
							: 'bg-cb-quaternary-950'
					"
					@click="switchTypeFilter('ALL')"
				>
					Total releases
					<span class="text-base font-bold">{{ releases.length }}</span>
				</button>
				<button
					class="bg-cb-primary-900 flex h-full w-full flex-col items-center justify-center rounded px-2 py-1"
					:class="
						onlyAlbums && !onlyEps && !onlySingles
							? 'bg-cb-primary-900'
							: 'bg-cb-quaternary-950'
					"
					@click="switchTypeFilter('ALBUM')"
				>
					Total albums
					<span class="text-base font-bold">
						{{ releases.filter((release) => release.type === 'ALBUM').length }}
					</span>
				</button>
				<button
					class="bg-cb-primary-900 flex h-full w-full flex-col items-center justify-center rounded px-2 py-1"
					:class="
						!onlyAlbums && onlyEps && !onlySingles
							? 'bg-cb-primary-900'
							: 'bg-cb-quaternary-950'
					"
					@click="switchTypeFilter('EP')"
				>
					Total EPs
					<span class="text-base font-bold">
						{{ releases.filter((release) => release.type === 'EP').length }}
					</span>
				</button>
				<button
					class="bg-cb-primary-900 flex h-full w-full flex-col items-center justify-center rounded px-2 py-1"
					:class="
						!onlyAlbums && !onlyEps && onlySingles
							? 'bg-cb-primary-900'
							: 'bg-cb-quaternary-950'
					"
					@click="switchTypeFilter('SINGLE')"
				>
					Total singles
					<span class="text-base font-bold">
						{{ releases.filter((release) => release.type === 'SINGLE').length }}
					</span>
				</button>
			</div>
		</div>
		<!-- <p class="text-sm italic text-cb-primary-900">Some troubles have been noticed with our release recovery API and are working to resolve them quickly. We apologize for the inconvenience.</p> -->
		<!-- Releases -->
		<transition-group
			tag="div"
			leave-active-class="animate__bounceOut"
			enter-active-class="animate__bounceIn"
			class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3.5 lg:grid-cols-6 xl:grid-cols-8"
		>
			<CardObject
				v-for="release in releasesDisplayed"
				:key="release.id_youtube_music ?? ''"
				:artist-id="release.artists?.[0]?.id ?? ''"
				:main-title="release.name"
				:sub-title="release.artists?.[0]?.name"
				:image="release.image ?? undefined"
				:release-date="release.date ?? undefined"
				:release-type="release.type ?? undefined"
				:object-link="`/release/${release.id}`"
				date-always-display
				class="!min-w-full"
			/>
		</transition-group>
		<SkeletonDefault v-if="loading" text="Loading..." class="h-48 w-full rounded-lg" />
		<!-- Back to top -->
		<div
			ref="backTop"
			class="sticky bottom-12 hidden w-full py-5 text-center lg:bottom-0"
		>
			<button
				class="bg-cb-quaternary-950 w-fit px-4 py-2.5 text-xs font-semibold shadow shadow-zinc-700"
				@click="backToTop"
			>
				Back to top
			</button>
		</div>
	</div>
</template>
