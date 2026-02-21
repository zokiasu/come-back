<script setup lang="ts">
	import { onClickOutside, useMediaQuery } from '@vueuse/core'
	import type { Artist } from '~/types'

	const props = withDefaults(
		defineProps<{
			placeholder?: string
			maxResults?: number
			containerClass?: string
			inputClass?: string
			dropdownClass?: string
		}>(),
		{
			placeholder: 'Search artists...',
			maxResults: 8,
			containerClass: '',
			inputClass: '',
			dropdownClass: '',
		},
	)

	const { placeholder, containerClass, inputClass, dropdownClass } = toRefs(props)

	const containerRef = ref<HTMLElement | null>(null)
	const searchInput = ref('')
	const artists = ref<Artist[]>([])
	const releases = ref<
		Array<{
			id: string
			name: string
			image?: string | null
			artists?: Artist[]
			musics?: Array<{ id_youtube_music?: string | null; name?: string | null }>
		}>
	>([])
	const musics = ref<
		Array<{
			id: string
			name: string
			thumbnails?: unknown
			artists?: Artist[]
			releases?: Array<{ id: string; name: string; image?: string | null }>
			id_youtube_music?: string | null
		}>
	>([])
	const isLoading = ref(false)
	const isOpen = ref(false)
	const activeIndex = ref(-1)
	const openArtists = ref(true)
	const openReleases = ref(true)
	const openMusics = ref(true)
	const previewTimeout = ref<number | null>(null)
	const previewingId = ref<string | null>(null)

	const { searchArtistsFullText, searchReleases, searchMusics } = useSupabaseSearch()
	const { playMusic, stopMusic, isCurrentlyPlaying } = useYouTube()
	const isDesktop = useMediaQuery('(min-width: 768px)')
	const router = useRouter()

	const debouncedSearch = useDebounce(async (query: string) => {
		if (query.length < 2) {
			artists.value = []
			releases.value = []
			musics.value = []
			isLoading.value = false
			activeIndex.value = -1
			return
		}

		isLoading.value = true
		try {
			const [artistsResult, releasesResult, musicsResult] = await Promise.all([
				searchArtistsFullText({ query, limit: props.maxResults }),
				searchReleases({ query, limit: Math.min(6, props.maxResults) }),
				searchMusics({ query, limit: Math.min(6, props.maxResults) }),
			])
			artists.value = artistsResult.artists
			releases.value = releasesResult.releases
			musics.value = musicsResult.musics
			activeIndex.value = -1
		} catch (error) {
			console.error('Search error:', error)
			artists.value = []
			releases.value = []
			musics.value = []
		} finally {
			isLoading.value = false
		}
	}, 250)

	watchEffect(() => {
		debouncedSearch(searchInput.value)
	})

	const closeDropdown = () => {
		isOpen.value = false
		stopPreview()
	}

	onClickOutside(containerRef, () => {
		closeDropdown()
	})

	const handleSelect = (artistId: string) => {
		router.push(`/artist/${artistId}`)
		searchInput.value = ''
		artists.value = []
		releases.value = []
		musics.value = []
		closeDropdown()
	}

	const handleSelectRelease = (releaseId: string) => {
		router.push(`/release/${releaseId}`)
		searchInput.value = ''
		artists.value = []
		releases.value = []
		musics.value = []
		closeDropdown()
	}

	const getMusicLink = (music: {
		releases?: Array<{ id: string }>
		artists?: Array<{ id: string }>
	}) => {
		if (music.releases?.[0]?.id) return `/release/${music.releases[0].id}`
		if (music.artists?.[0]?.id) return `/artist/${music.artists[0].id}`
		return '/'
	}

	const handleSelectMusic = (music: {
		releases?: Array<{ id: string }>
		artists?: Array<{ id: string }>
	}) => {
		router.push(getMusicLink(music))
		searchInput.value = ''
		artists.value = []
		releases.value = []
		musics.value = []
		closeDropdown()
	}

	const visibleArtists = computed(() => (openArtists.value ? artists.value : []))
	const visibleReleases = computed(() => (openReleases.value ? releases.value : []))
	const visibleMusics = computed(() => (openMusics.value ? musics.value : []))

	const releaseOffset = computed(() => visibleArtists.value.length)
	const musicOffset = computed(
		() => visibleArtists.value.length + visibleReleases.value.length,
	)

	const flatResults = computed(() => {
		const list: Array<{
			type: 'artist' | 'release' | 'music'
			id: string
		}> = []
		for (const a of visibleArtists.value) {
			list.push({ type: 'artist', id: a.id })
		}
		for (const r of visibleReleases.value) {
			list.push({ type: 'release', id: r.id })
		}
		for (const m of visibleMusics.value) {
			list.push({ type: 'music', id: m.id })
		}
		return list
	})

	const moveActive = (direction: 1 | -1) => {
		const total = flatResults.value.length
		if (!total) return
		const next = activeIndex.value + direction
		if (next < 0) {
			activeIndex.value = total - 1
		} else if (next >= total) {
			activeIndex.value = 0
		} else {
			activeIndex.value = next
		}
	}

	const handleKeydown = (event: KeyboardEvent) => {
		if (!isOpen.value) return

		if (event.key === 'ArrowDown') {
			event.preventDefault()
			moveActive(1)
		} else if (event.key === 'ArrowUp') {
			event.preventDefault()
			moveActive(-1)
		} else if (event.key === 'Enter') {
			if (activeIndex.value < 0) return
			const item = flatResults.value[activeIndex.value]
			if (!item) return
			event.preventDefault()
			if (item.type === 'artist') {
				const artist = visibleArtists.value.find((a) => a.id === item.id)
				if (artist) handleSelect(artist.id)
			} else if (item.type === 'release') {
				const release = visibleReleases.value.find((r) => r.id === item.id)
				if (release) handleSelectRelease(release.id)
			} else if (item.type === 'music') {
				const music = visibleMusics.value.find((m) => m.id === item.id)
				if (music) handleSelectMusic(music)
			}
		} else if (event.key === 'Escape') {
			event.preventDefault()
			closeDropdown()
		}
	}

	const getReleasePreview = (release: {
		musics?: Array<{ id_youtube_music?: string | null; name?: string | null }>
		artists?: Artist[]
		name: string
	}) => {
		const withMv = release.musics?.find((m) => m?.id_youtube_music)
		const fallback = release.musics?.[0]
		const preview = withMv || fallback
		return {
			id: preview?.id_youtube_music || null,
			name: preview?.name || release.name,
			artist: release.artists?.[0]?.name || 'Unknown artist',
		}
	}

	const startPreview = (id: string, name: string, artist: string) => {
		if (!isDesktop.value) return
		if (!id) return
		if (previewTimeout.value) {
			window.clearTimeout(previewTimeout.value)
		}
		previewTimeout.value = window.setTimeout(() => {
			previewingId.value = id
			playMusic(id, name, artist)
		}, 200)
	}

	const stopPreview = (id?: string) => {
		if (!isDesktop.value) return
		if (previewTimeout.value) {
			window.clearTimeout(previewTimeout.value)
			previewTimeout.value = null
		}
		if (id && previewingId.value !== id) return
		if (previewingId.value && isCurrentlyPlaying(previewingId.value)) {
			stopMusic()
		}
		previewingId.value = null
	}
</script>

<template>
	<div ref="containerRef" class="relative w-full" :class="containerClass">
		<UInput
			v-model="searchInput"
			:placeholder="placeholder"
			icon="i-heroicons-magnifying-glass"
			class="w-full"
			:class="inputClass"
			:ui="{ base: 'bg-cb-quinary-900/70 text-white placeholder:text-cb-tertiary-500' }"
			@focus="isOpen = true"
			@keydown="handleKeydown"
		/>

		<div
			v-if="
				isOpen &&
				(isLoading ||
					artists.length ||
					releases.length ||
					musics.length ||
					searchInput.length >= 2)
			"
			class="scrollBarLight absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-cb-quinary-900/70 bg-cb-secondary-950/95 p-2 shadow-lg"
			:class="dropdownClass"
		>
			<div v-if="isLoading" class="px-3 py-2 text-xs text-cb-tertiary-400">
				Searching...
			</div>
			<div v-if="artists.length" class="space-y-1">
				<div class="flex items-center justify-between px-3 pt-2">
					<p class="text-[11px] uppercase text-cb-tertiary-500">Artists</p>
					<UButton
						variant="ghost"
						color="neutral"
						size="xs"
						:label="openArtists ? 'Hide' : 'Show'"
						class="text-cb-tertiary-400"
						@click="openArtists = !openArtists"
					/>
				</div>
				<div v-if="openArtists">
				<button
					v-for="(artist, index) in artists"
					:key="artist.id"
					type="button"
					class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-cb-quinary-900/80"
					:class="activeIndex === index ? 'bg-cb-quinary-900/80' : ''"
					@click="handleSelect(artist.id)"
				>
					<div class="h-8 w-8 overflow-hidden rounded-full bg-cb-quinary-900">
						<NuxtImg
							v-if="artist.image"
							:src="artist.image"
							:alt="artist.name"
							format="webp"
							class="h-full w-full object-cover"
						/>
					</div>
					<span class="truncate">{{ artist.name }}</span>
				</button>
				</div>
			</div>

			<div v-if="releases.length" class="space-y-1">
				<div class="flex items-center justify-between px-3 pt-2">
					<p class="text-[11px] uppercase text-cb-tertiary-500">Releases</p>
					<UButton
						variant="ghost"
						color="neutral"
						size="xs"
						:label="openReleases ? 'Hide' : 'Show'"
						class="text-cb-tertiary-400"
						@click="openReleases = !openReleases"
					/>
				</div>
				<div v-if="openReleases">
				<button
					v-for="(release, index) in releases"
					:key="release.id"
					type="button"
					class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-cb-quinary-900/80"
					:class="
						activeIndex === index + releaseOffset ? 'bg-cb-quinary-900/80' : ''
					"
					@click="handleSelectRelease(release.id)"
					@mouseenter="
						() => {
							const preview = getReleasePreview(release)
							if (preview.id) startPreview(preview.id, preview.name, preview.artist)
						}
					"
					@mouseleave="
						() => {
							const preview = getReleasePreview(release)
							if (preview.id) stopPreview(preview.id)
						}
					"
				>
					<div class="h-8 w-8 overflow-hidden rounded bg-cb-quinary-900">
						<NuxtImg
							v-if="release.image"
							:src="release.image"
							:alt="release.name"
							format="webp"
							class="h-full w-full object-cover"
						/>
					</div>
					<div class="min-w-0">
						<p class="truncate">{{ release.name }}</p>
						<p class="text-cb-tertiary-500 truncate text-xs">
							{{ release.artists?.map((a) => a.name).join(', ') || 'Unknown artist' }}
						</p>
					</div>
					<span
						v-if="previewingId && getReleasePreview(release).id === previewingId"
						class="ml-auto text-[11px] text-cb-tertiary-400"
					>
						Previewing
					</span>
				</button>
				</div>
			</div>

			<div v-if="musics.length" class="space-y-1">
				<div class="flex items-center justify-between px-3 pt-2">
					<p class="text-[11px] uppercase text-cb-tertiary-500">Musics</p>
					<UButton
						variant="ghost"
						color="neutral"
						size="xs"
						:label="openMusics ? 'Hide' : 'Show'"
						class="text-cb-tertiary-400"
						@click="openMusics = !openMusics"
					/>
				</div>
				<div v-if="openMusics">
				<button
					v-for="(music, index) in musics"
					:key="music.id"
					type="button"
					class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-cb-quinary-900/80"
					:class="
						activeIndex === index + musicOffset
							? 'bg-cb-quinary-900/80'
							: ''
					"
					@click="handleSelectMusic(music)"
					@mouseenter="
						() => {
							if (music.id_youtube_music) {
								startPreview(
									music.id_youtube_music,
									music.name,
									music.artists?.[0]?.name || 'Unknown artist',
								)
							}
						}
					"
					@mouseleave="
						() => {
							if (music.id_youtube_music) stopPreview(music.id_youtube_music)
						}
					"
				>
					<div class="h-8 w-8 overflow-hidden rounded bg-cb-quinary-900">
						<NuxtImg
							v-if="music.thumbnails && Array.isArray(music.thumbnails) && music.thumbnails[0]"
							:src="(music.thumbnails[0] as { url?: string }).url"
							:alt="music.name"
							format="webp"
							class="h-full w-full object-cover"
						/>
					</div>
					<div class="min-w-0">
						<p class="truncate">{{ music.name }}</p>
						<p class="text-cb-tertiary-500 truncate text-xs">
							{{ music.artists?.[0]?.name || 'Unknown artist' }}
						</p>
					</div>
					<span
						v-if="previewingId === music.id_youtube_music"
						class="ml-auto text-[11px] text-cb-tertiary-400"
					>
						Previewing
					</span>
				</button>
				</div>
			</div>

			<div
				v-if="!isLoading && !artists.length && !releases.length && !musics.length"
				class="px-3 py-2 text-xs text-cb-tertiary-500"
			>
				No results found.
			</div>
		</div>
	</div>
</template>
