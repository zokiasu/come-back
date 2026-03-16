<script setup lang="ts">
	import draggable from 'vuedraggable'
	import { usePlaylist, type PlaylistItem } from '~/composables/usePlaylist'

	const {
		playlist,
		currentIndex,
		removeFromPlaylist,
		playAtIndex,
		clearPlaylist,
		getPlaylistInfo,
		reorderPlaylist,
	} = usePlaylist()

	const isOpen = defineModel<boolean>('isOpen', { default: false })

	const playlistInfo = computed(() => getPlaylistInfo())
	const searchQuery = ref('')

	const normalizedSearch = computed(() => searchQuery.value.trim().toLowerCase())
	const isFiltering = computed(() => normalizedSearch.value.length > 0)

	const filteredPlaylist = computed(() => {
		if (!normalizedSearch.value) return playlist.value
		return playlist.value.filter((item) => {
			const title = item.title?.toLowerCase() ?? ''
			const artist = item.artist?.toLowerCase() ?? ''
			return (
				title.includes(normalizedSearch.value) || artist.includes(normalizedSearch.value)
			)
		})
	})

	const sortablePlaylist = computed<PlaylistItem[]>({
		get: () => [...playlist.value],
		set: (next) => reorderPlaylist([...next]),
	})

	const getItemIndex = (item: { uid: string }) =>
		playlist.value.findIndex((entry) => entry.uid === item.uid)

	const handlePlayItem = (item: { uid: string }) => {
		const index = getItemIndex(item)
		if (index >= 0) playAtIndex(index)
	}

	const handleRemoveItem = (item: { uid: string }) => {
		const index = getItemIndex(item)
		if (index >= 0) removeFromPlaylist(index)
	}

	const handleClearPlaylist = () => {
		clearPlaylist()
		isOpen.value = false
	}

	const formatAddedTime = (date: Date) => {
		return new Intl.DateTimeFormat('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: true,
		}).format(date)
	}
</script>

<template>
	<div v-if="isOpen" class="w-full" @click="isOpen = false">
		<div
			class="bg-cb-secondary-950/95 border-cb-quinary-900/70 mx-auto flex h-full w-full flex-col overflow-hidden rounded-3xl border shadow-xl shadow-black/40 backdrop-blur sm:h-3/4 sm:max-h-[600px] sm:max-w-md"
			@click.stop
		>
			<!-- Header -->
			<div
				class="border-cb-quinary-900/70 flex flex-shrink-0 items-center justify-between border-b px-5 py-4"
			>
				<div>
					<p class="text-cb-tertiary-500 text-xs uppercase">Queue</p>
					<h3 class="text-lg font-semibold">Playlist</h3>
					<p v-if="playlistInfo.isActive" class="text-cb-tertiary-400 text-sm">
						{{ playlistInfo.total }} track{{ playlistInfo.total > 1 ? 's' : '' }}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<button
						v-if="playlist.length > 0"
						type="button"
						aria-label="Clear playlist"
						class="text-cb-tertiary-400 rounded px-2 py-1 text-xs hover:text-white"
						@click="handleClearPlaylist"
					>
						Clear
					</button>
					<button
						type="button"
						aria-label="Close playlist panel"
						class="text-cb-tertiary-400 rounded p-1 hover:text-white"
						@click="isOpen = false"
					>
						<IconClose class="h-5 w-5" />
					</button>
				</div>
			</div>

			<!-- Playlist Content -->
			<div class="flex min-h-0 flex-1 flex-col">
				<div class="border-cb-quinary-900/70 flex-shrink-0 border-b px-4 py-3">
					<UInput
						v-model="searchQuery"
						icon="i-heroicons-magnifying-glass"
						placeholder="Search in playlist..."
						class="w-full"
					/>
				</div>

				<!-- Empty State -->
				<div
					v-if="!playlistInfo.isActive || playlist.length === 0"
					class="flex flex-1 flex-col items-center justify-center p-8 text-center"
				>
					<div class="text-cb-tertiary-500 bg-cb-quaternary-900 mb-4 rounded-full p-6">
						<IconPlay class="h-8 w-8" />
					</div>
					<h4 class="text-cb-tertiary-300 mb-2 text-lg font-medium">
						No tracks in the playlist
					</h4>
					<p class="text-cb-tertiary-500 text-sm">
						Add tracks by clicking the play button
					</p>
				</div>

				<div
					v-else-if="filteredPlaylist.length === 0"
					class="text-cb-tertiary-500 flex flex-1 items-center justify-center px-6 text-center text-sm"
				>
					No results for this search.
				</div>

				<!-- Playlist Items -->
				<div
					v-else
					class="scrollbar-thin scrollbar-thumb-cb-quinary-900 scrollbar-track-transparent flex-1 overflow-y-auto"
				>
					<draggable
						v-if="!isFiltering"
						v-model="sortablePlaylist"
						item-key="uid"
						handle=".cb-drag-handle"
						ghost-class="opacity-50"
						drag-class="!bg-cb-quinary-900/90"
						animation="200"
					>
						<template #item="{ element: item, index }">
							<div
								class="group border-cb-quinary-900/60 flex items-center gap-3 border-b px-4 py-3 transition-colors duration-200"
								:class="{
									'bg-cb-quinary-900/80': index === currentIndex,
									'hover:bg-cb-quinary-900/60': index !== currentIndex,
								}"
							>
								<button
									type="button"
									class="cb-drag-handle text-cb-tertiary-500 hidden hover:text-white sm:block"
									aria-label="Reorder"
								>
									<UIcon name="i-heroicons-bars-3" class="h-4 w-4" />
								</button>

								<button
									type="button"
									class="border-cb-quinary-900/60 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors"
									:class="{
										'bg-cb-quinary-900 text-white': index === currentIndex,
										'bg-cb-secondary-950 hover:bg-cb-quinary-900 group-hover:text-white':
											index !== currentIndex,
									}"
									:aria-label="
										index === currentIndex ? `Pause ${item.title}` : `Play ${item.title}`
									"
									@click="handlePlayItem(item)"
								>
									<IconPause v-if="index === currentIndex" class="h-4 w-4" />
									<IconPlay v-else class="h-4 w-4" />
								</button>

								<div
									class="bg-cb-quinary-900/70 relative h-12 w-12 shrink-0 overflow-hidden rounded-xl"
								>
									<img
										v-if="item.image"
										:src="item.image"
										:alt="item.title"
										class="h-full w-full object-cover"
										loading="lazy"
									/>
									<div
										v-else
										class="text-cb-tertiary-400 flex h-full w-full items-center justify-center"
									>
										<UIcon name="i-material-symbols-music-note" class="h-5 w-5" />
									</div>
								</div>

								<div class="min-w-0 flex-1">
									<h4
										class="truncate font-medium"
										:class="{
											'text-white': index === currentIndex,
											'text-cb-tertiary-200': index !== currentIndex,
										}"
									>
										{{ item.title }}
									</h4>
									<p class="text-cb-tertiary-400 truncate text-sm">
										{{ item.artist }}
									</p>
									<p class="text-cb-tertiary-500 text-xs">
										Added at {{ formatAddedTime(item.addedAt) }}
									</p>
								</div>

								<div
									class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<button
										type="button"
										class="text-cb-tertiary-500 rounded p-1 hover:text-white"
										:aria-label="`Remove ${item.title} from playlist`"
										@click="handleRemoveItem(item)"
									>
										<IconDelete class="h-4 w-4" />
									</button>
								</div>

								<div
									v-if="index === currentIndex"
									class="bg-cb-tertiary-300 h-8 w-1 shrink-0 rounded-full"
								></div>
							</div>
						</template>
					</draggable>

					<div
						v-for="item in filteredPlaylist"
						v-else
						:key="item.uid"
						class="group border-cb-quinary-900/60 hover:bg-cb-quinary-900/60 flex items-center gap-3 border-b px-4 py-3 transition-colors duration-200"
					>
						<button
							type="button"
							class="border-cb-quinary-900/60 bg-cb-secondary-950 hover:bg-cb-quinary-900 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors group-hover:text-white"
							:aria-label="`Play ${item.title}`"
							@click="handlePlayItem(item)"
						>
							<IconPlay class="h-4 w-4" />
						</button>

						<div
							class="bg-cb-quinary-900/70 relative h-12 w-12 shrink-0 overflow-hidden rounded-xl"
						>
							<img
								v-if="item.image"
								:src="item.image"
								:alt="item.title"
								class="h-full w-full object-cover"
								loading="lazy"
							/>
							<div
								v-else
								class="text-cb-tertiary-400 flex h-full w-full items-center justify-center"
							>
								<UIcon name="i-material-symbols-music-note" class="h-5 w-5" />
							</div>
						</div>

						<div class="min-w-0 flex-1">
							<h4 class="text-cb-tertiary-200 truncate font-medium">
								{{ item.title }}
							</h4>
							<p class="text-cb-tertiary-400 truncate text-sm">
								{{ item.artist }}
							</p>
						</div>

						<div class="flex shrink-0 items-center gap-1">
							<button
								type="button"
								class="text-cb-tertiary-500 rounded p-1 hover:text-white"
								:aria-label="`Remove ${item.title} from playlist`"
								@click="handleRemoveItem(item)"
							>
								<IconDelete class="h-4 w-4" />
							</button>
						</div>
					</div>
				</div>

				<!-- Footer Info -->
				<div
					v-if="playlistInfo.isActive && playlist.length > 0"
					class="border-cb-quinary-900/70 flex-shrink-0 border-t px-4 py-3"
				>
					<div class="flex items-center justify-between text-sm">
						<span class="text-cb-tertiary-400">
							Current: {{ playlistInfo.current }}/{{ playlistInfo.total }}
						</span>
						<span class="text-cb-tertiary-500">
							{{ playlist.length }} song{{ playlist.length > 1 ? 's' : '' }} in queue
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
