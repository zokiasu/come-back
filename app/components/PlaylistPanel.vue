<script setup lang="ts">
	import { usePlaylist } from '~/composables/usePlaylist'

	const {
		playlist,
		currentIndex,
		isPlaylistActive,
		removeFromPlaylist,
		playAtIndex,
		clearPlaylist,
		getPlaylistInfo,
	} = usePlaylist()

	const isOpen = defineModel<boolean>('isOpen', { default: false })

	const playlistInfo = computed(() => getPlaylistInfo())

	const handlePlayItem = (index: number) => {
		playAtIndex(index)
	}

	const handleRemoveItem = (index: number) => {
		removeFromPlaylist(index)
	}

	const handleClearPlaylist = () => {
		clearPlaylist()
		isOpen.value = false
	}

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = Math.floor(seconds % 60)
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	const formatAddedTime = (date: Date) => {
		return new Intl.DateTimeFormat('fr-FR', {
			hour: '2-digit',
			minute: '2-digit',
		}).format(date)
	}
</script>

<template>
	<div v-if="isOpen" @click="isOpen = false">
		<div
			class="bg-cb-secondary-950 flex h-full w-full max-w-md flex-col overflow-hidden rounded-lg shadow-xl sm:h-3/4 sm:max-h-[600px]"
			@click.stop
		>
			<!-- Header -->
			<div
				class="border-cb-tertiary-700 flex flex-shrink-0 items-center justify-between border-b p-4"
			>
				<div>
					<h3 class="text-lg font-semibold">Liste de lecture</h3>
					<p v-if="playlistInfo.isActive" class="text-cb-tertiary-400 text-sm">
						{{ playlistInfo.total }} musique{{ playlistInfo.total > 1 ? 's' : '' }}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<button
						v-if="playlist.length > 0"
						class="text-cb-tertiary-400 hover:text-cb-primary-900 rounded p-1 text-sm"
						@click="handleClearPlaylist"
					>
						Vider
					</button>
					<button
						class="text-cb-tertiary-400 hover:text-cb-tertiary-200 rounded p-1"
						@click="isOpen = false"
					>
						<IconClose class="h-5 w-5" />
					</button>
				</div>
			</div>

			<!-- Playlist Content -->
			<div class="flex min-h-0 flex-1 flex-col">
				<!-- Empty State -->
				<div
					v-if="!playlistInfo.isActive || playlist.length === 0"
					class="flex flex-1 flex-col items-center justify-center p-8 text-center"
				>
					<div class="text-cb-tertiary-500 bg-cb-quaternary-900 mb-4 rounded-full p-6">
						<IconPlay class="h-8 w-8" />
					</div>
					<h4 class="text-cb-tertiary-300 mb-2 text-lg font-medium">
						Aucune musique dans la liste
					</h4>
					<p class="text-cb-tertiary-500 text-sm">
						Ajoutez des musiques en cliquant sur le bouton play
					</p>
				</div>

				<!-- Playlist Items -->
				<div
					v-else
					class="scrollbar-thin scrollbar-thumb-cb-tertiary-600 scrollbar-track-transparent flex-1 overflow-y-auto"
				>
					<div
						v-for="(item, index) in playlist"
						:key="`${item.videoId}-${index}`"
						class="group border-cb-tertiary-800 flex items-center gap-3 border-b p-3 transition-colors duration-200"
						:class="{
							'bg-cb-primary-900/20': index === currentIndex,
							'hover:bg-cb-tertiary-900/20': index !== currentIndex,
						}"
					>
						<!-- Play Button / Current Indicator -->
						<button
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors"
							:class="{
								'bg-cb-primary-900 text-white': index === currentIndex,
								'bg-cb-quaternary-900 hover:bg-cb-primary-900 group-hover:text-white':
									index !== currentIndex,
							}"
							@click="handlePlayItem(index)"
						>
							<IconPause v-if="index === currentIndex" class="h-4 w-4" />
							<IconPlay v-else class="h-4 w-4" />
						</button>

						<!-- Song Info -->
						<div class="min-w-0 flex-1">
							<h4
								class="truncate font-medium"
								:class="{
									'text-cb-primary-900': index === currentIndex,
									'text-cb-tertiary-200': index !== currentIndex,
								}"
							>
								{{ item.title }}
							</h4>
							<p class="text-cb-tertiary-400 truncate text-sm">
								{{ item.artist }}
							</p>
							<p class="text-cb-tertiary-500 text-xs">
								Ajoutée à {{ formatAddedTime(item.addedAt) }}
							</p>
						</div>

						<!-- Actions -->
						<div
							class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<button
								class="text-cb-tertiary-500 hover:text-cb-primary-900 rounded p-1"
								@click="handleRemoveItem(index)"
							>
								<IconDelete class="h-4 w-4" />
							</button>
						</div>

						<!-- Current Playing Indicator -->
						<div
							v-if="index === currentIndex"
							class="bg-cb-primary-900 h-8 w-1 shrink-0 rounded-full"
						></div>
					</div>
				</div>

				<!-- Footer Info -->
				<div
					v-if="playlistInfo.isActive && playlist.length > 0"
					class="border-cb-tertiary-700 flex-shrink-0 border-t p-3"
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
