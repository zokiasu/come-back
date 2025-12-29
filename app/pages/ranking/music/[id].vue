<template>
	<div class="flex h-[calc(100vh-5rem)] overflow-hidden">
		<!-- Main content: Music exploration -->
		<div ref="scrollContainer" class="scrollBarLight min-w-0 flex-1 overflow-y-auto p-5">
			<!-- Header with back button -->
			<div class="mb-4 flex items-center gap-3">
				<UButton
					icon="i-heroicons-arrow-left"
					color="neutral"
					variant="ghost"
					to="/ranking"
				/>
				<div>
					<h1 class="text-xl font-bold">Explorer les musiques</h1>
					<p class="text-cb-tertiary-500 text-xs">
						Cliquez sur + pour ajouter une musique au ranking
					</p>
				</div>
			</div>

			<!-- Filters -->
			<div class="mb-4 space-y-2">
				<div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
					<UInput v-model="search" placeholder="Rechercher une musique..." class="w-full" />
					<UInputMenu
						v-model="selectedArtistsWithLabel"
						:items="artistsForMenu"
						by="id"
						multiple
						placeholder="Artistes..."
						searchable
						searchable-placeholder="Rechercher un artiste..."
						class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
						:ui="{
							content: 'bg-cb-quaternary-950',
							item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
						}"
					/>
					<UInputMenu
						v-model="selectedYearsWithLabel"
						:items="yearsForMenu"
						by="value"
						multiple
						placeholder="Années..."
						searchable
						searchable-placeholder="Rechercher..."
						class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
						:ui="{
							content: 'bg-cb-quaternary-950',
							item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
						}"
					/>
					<UInputMenu
						v-model="selectedStylesWithLabel"
						:items="stylesForMenu"
						by="value"
						multiple
						placeholder="Styles..."
						searchable
						searchable-placeholder="Rechercher..."
						class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
						:ui="{
							content: 'bg-cb-quaternary-950',
							item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
						}"
					/>
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<UButton
						color="secondary"
						variant="outline"
						size="xs"
						@click="resetFilters"
					>
						Reset
					</UButton>
					<UButton
						color="neutral"
						variant="outline"
						size="xs"
						@click="toggleOrderDirection"
					>
						<UIcon
							name="material-symbols-light:sort"
							class="size-4"
							:class="orderDirection === 'desc' ? 'rotate-180' : ''"
						/>
						{{ orderDirection === 'desc' ? 'Plus récent' : 'Plus ancien' }}
					</UButton>
					<UCheckbox v-model="isMv" label="MVs uniquement" />

					<span class="text-cb-tertiary-500 ml-auto text-xs">
						{{ musicsList.length }} / {{ totalMusics }} résultats
					</span>
				</div>
			</div>

			<!-- Music grid -->
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
				<div
					v-for="music in musicsList"
					:key="music.id"
					class="bg-cb-quinary-900 group relative flex items-center gap-3 rounded p-2"
				>
					<!-- Play button -->
					<button
						v-if="music.id_youtube_music"
						class="flex size-10 shrink-0 items-center justify-center rounded-full transition-colors"
						:class="isCurrentlyPlaying(music.id_youtube_music) ? 'bg-cb-primary-900' : 'bg-cb-quaternary-950 hover:bg-cb-primary-900'"
						@click.stop="handlePlayMusic(music)"
					>
						<UIcon
							:name="isCurrentlyPlaying(music.id_youtube_music) ? 'i-heroicons-pause-solid' : 'i-heroicons-play-solid'"
							class="size-5 text-white"
						/>
					</button>
					<div v-else class="size-10 shrink-0" />

					<!-- Thumbnail -->
					<NuxtImg
						:src="getMusicThumbnailFromList(music)"
						:alt="music.name"
						class="h-12 w-12 shrink-0 rounded object-cover"
						format="webp"
						loading="lazy"
					/>

					<!-- Info -->
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{{ music.name }}</p>
						<p class="text-cb-tertiary-500 truncate text-xs">
							{{ formatArtists(music.artists) }}
						</p>
						<div class="mt-1 flex items-center gap-2">
							<span v-if="music.date" class="text-cb-tertiary-400 text-xs">
								{{ formatDate(music.date) }}
							</span>
							<span v-if="music.ismv" class="text-cb-primary-900 text-xs">MV</span>
							<span v-if="music.duration" class="text-cb-tertiary-500 text-xs">
								{{ formatDuration(music.duration) }}
							</span>
						</div>
					</div>

					<!-- Add button -->
					<button
						class="flex size-8 shrink-0 items-center justify-center rounded-full transition-colors"
						:class="
							isMusicInCurrentRanking(music.id)
								? 'bg-cb-primary-900 text-white'
								: 'bg-cb-quaternary-950 hover:bg-cb-primary-900 text-white'
						"
						:disabled="addingMusicId === music.id"
						@click="toggleMusicInRanking(music)"
					>
						<UIcon
							v-if="addingMusicId === music.id"
							name="line-md:loading-twotone-loop"
							class="size-4 animate-spin"
						/>
						<UIcon
							v-else-if="isMusicInCurrentRanking(music.id)"
							name="i-heroicons-check"
							class="size-4"
						/>
						<UIcon v-else name="i-heroicons-plus" class="size-4" />
					</button>
				</div>
			</div>

			<!-- Loading indicator -->
			<div
				v-if="loading"
				class="text-cb-tertiary-500 flex items-center justify-center gap-2 py-4 text-xs"
			>
				<UIcon name="line-md:loading-twotone-loop" class="size-4 animate-spin" />
				<p>{{ firstLoad ? 'Chargement...' : 'Chargement...' }}</p>
			</div>

			<!-- Load more -->
			<div
				v-if="!loading && musicsList.length > 0 && musicsList.length < totalMusics"
				class="flex justify-center gap-2 py-4"
			>
				<UButton
					color="primary"
					variant="outline"
					@click="loadMusics(false)"
				>
					Charger plus
				</UButton>
				<UButton
					color="neutral"
					variant="ghost"
					@click="loadAllMusics"
				>
					Charger tout ({{ totalMusics - musicsList.length }} restants)
				</UButton>
			</div>

			<!-- No results -->
			<p
				v-if="!loading && musicsList.length === 0"
				class="bg-cb-quaternary-950 w-full rounded p-5 text-center text-sm"
			>
				Aucune musique trouvée
			</p>
		</div>

		<!-- Sidebar: Current ranking -->
		<div
			class="bg-cb-quaternary-950 flex w-80 shrink-0 flex-col overflow-hidden border-l border-zinc-700 lg:w-96"
		>
			<!-- Ranking header -->
			<div class="border-b border-zinc-700 p-4">
				<div class="flex items-center justify-between">
					<div v-if="!isEditingName" class="min-w-0 flex-1">
						<h2
							class="cursor-pointer truncate text-lg font-bold hover:underline"
							@click="startEditName"
						>
							{{ ranking?.name || 'Chargement...' }}
						</h2>
						<p class="text-cb-tertiary-500 text-xs">
							{{ rankingItems.length }}/100 musiques
						</p>
					</div>
					<div v-else class="flex-1">
						<UInput
							v-model="editingName"
							class="w-full"
							autofocus
							@blur="saveName"
							@keyup.enter="saveName"
							@keyup.escape="cancelEditName"
						/>
					</div>
					<div class="ml-2 flex items-center gap-1">
						<UButton
							:icon="ranking?.is_public ? 'i-heroicons-globe-alt' : 'i-heroicons-lock-closed'"
							size="xs"
							color="neutral"
							variant="ghost"
							:title="ranking?.is_public ? 'Public' : 'Privé'"
							@click="togglePublic"
						/>
						<UButton
							icon="i-heroicons-cog-6-tooth"
							size="xs"
							color="neutral"
							variant="ghost"
							@click="openSettingsModal"
						/>
					</div>
				</div>
			</div>

			<!-- Ranking items list (scrollable) -->
			<div class="scrollBarLight flex-1 overflow-y-auto p-2">
				<div v-if="isLoadingRanking" class="flex items-center justify-center py-10">
					<UIcon
						name="line-md:loading-twotone-loop"
						class="text-cb-primary-900 size-6 animate-spin"
					/>
				</div>

				<div
					v-else-if="rankingItems.length === 0"
					class="text-cb-tertiary-500 py-10 text-center text-sm"
				>
					<UIcon name="i-heroicons-musical-note" class="mx-auto mb-2 size-10" />
					<p>Aucune musique</p>
					<p class="text-xs">Ajoutez des musiques depuis la liste</p>
				</div>

				<draggable
					v-else
					v-model="localRankingItems"
					item-key="id"
					handle=".drag-handle"
					ghost-class="opacity-50"
					drag-class="!bg-cb-primary-900/20"
					animation="200"
					class="space-y-1"
					@end="onDragEnd"
				>
					<template #item="{ element: item, index }">
						<div
							class="bg-cb-quinary-900 group flex items-center gap-2 rounded p-2"
						>
							<!-- Position -->
							<span
								class="text-cb-tertiary-500 w-6 shrink-0 text-center text-xs font-medium"
							>
								{{ index + 1 }}
							</span>

							<!-- Drag handle -->
							<UIcon
								name="i-heroicons-bars-3"
								class="drag-handle text-cb-tertiary-500 size-4 shrink-0 cursor-grab active:cursor-grabbing"
							/>

							<!-- Play button -->
							<button
								v-if="item.music.id_youtube_music"
								class="flex size-8 shrink-0 items-center justify-center rounded-full transition-colors"
								:class="isCurrentlyPlaying(item.music.id_youtube_music) ? 'bg-cb-primary-900' : 'bg-cb-quaternary-950 hover:bg-cb-primary-900'"
								@click.stop="handlePlayMusic(item.music)"
							>
								<UIcon
									:name="isCurrentlyPlaying(item.music.id_youtube_music) ? 'i-heroicons-pause-solid' : 'i-heroicons-play-solid'"
									class="size-4 text-white"
								/>
							</button>

							<!-- Thumbnail -->
							<NuxtImg
								:src="getMusicThumbnail(item.music)"
								:alt="item.music.name"
								class="h-10 w-10 shrink-0 rounded object-cover"
								format="webp"
								loading="lazy"
							/>

							<!-- Info -->
							<div class="min-w-0 flex-1">
								<p class="truncate text-xs font-medium">{{ item.music.name }}</p>
								<p class="text-cb-tertiary-500 truncate text-xs">
									{{ formatArtists(item.music.artists || []) }}
								</p>
								<p v-if="item.music.date" class="text-cb-tertiary-400 truncate text-xs">
									{{ formatDate(item.music.date) }}
								</p>
							</div>

							<!-- Remove button -->
							<button
								class="text-cb-tertiary-500 hover:text-red-500 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
								@click="removeFromRanking(item.music_id)"
							>
								<UIcon name="i-heroicons-x-mark" class="size-4" />
							</button>
						</div>
					</template>
				</draggable>
			</div>

			<!-- Footer actions -->
			<div class="border-t border-zinc-700 p-4">
				<div class="flex gap-2">
					<UButton
						label="Retour aux rankings"
						color="neutral"
						variant="outline"
						class="flex-1"
						to="/ranking"
					/>
				</div>
			</div>
		</div>

		<!-- Settings Modal -->
		<UModal v-model:open="isSettingsModalOpen">
			<template #content>
				<div class="bg-cb-secondary-950 p-6">
					<h2 class="mb-4 text-lg font-semibold">Paramètres du ranking</h2>
					<div class="space-y-4">
						<UFormField label="Nom">
							<UInput v-model="settingsName" class="w-full" />
						</UFormField>
						<UFormField label="Description">
							<UTextarea
								v-model="settingsDescription"
								:rows="3"
								class="w-full"
								placeholder="Description optionnelle..."
							/>
						</UFormField>
						<UFormField>
							<UCheckbox v-model="settingsIsPublic" label="Rendre ce ranking public" />
						</UFormField>
					</div>
					<div class="mt-6 flex justify-end gap-2">
						<UButton
							label="Annuler"
							color="neutral"
							variant="ghost"
							@click="isSettingsModalOpen = false"
						/>
						<UButton
							label="Enregistrer"
							color="primary"
							:loading="isSavingSettings"
							@click="saveSettings"
						/>
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
	import type {
		Music,
		Artist,
		ArtistMenuItem,
		UserRankingWithItems,
		UserRankingItem,
	} from '~/types'
	import { useInfiniteScroll, useDebounceFn } from '@vueuse/core'
	import draggable from 'vuedraggable'

	type YearMenuItem = { value: number; label: string }
	type StyleMenuItem = { value: string; label: string }

	const route = useRoute()
	const rankingId = computed(() => route.params.id as string)
	const scrollContainer = useTemplateRef<HTMLElement>('scrollContainer')

	const { getMusicsByPage } = useSupabaseMusic()
	const { getAllArtists } = useSupabaseArtist()
	const {
		getRankingById,
		updateRanking,
		addMusicToRanking,
		removeMusicFromRanking,
		reorderRankingItems,
	} = useSupabaseRanking()
	const { addToPlaylist } = useYouTube()
	const idYoutubeVideo = useIdYoutubeVideo()
	const isPlayingVideo = useIsPlayingVideo()

	// Ranking state
	const ranking = ref<UserRankingWithItems | null>(null)
	const rankingItems = computed(() => ranking.value?.items || [])
	const localRankingItems = ref<(UserRankingItem & { music: Music })[]>([])
	const isLoadingRanking = ref(true)

	// Music exploration state
	const search = ref('')
	const selectedArtists = ref<string[]>([])
	const selectedArtistsWithLabel = ref<ArtistMenuItem[]>([])
	const selectedYears = ref<number[]>([])
	const selectedYearsWithLabel = ref<YearMenuItem[]>([])
	const selectedStyles = ref<string[]>([])
	const selectedStylesWithLabel = ref<StyleMenuItem[]>([])
	const isMv = ref(false)
	const orderDirection = ref<'asc' | 'desc'>('desc')

	// Pagination
	const currentPage = ref(1)
	const totalPages = ref(1)
	const totalMusics = ref(0)
	const limit = 30
	const loading = ref(false)
	const firstLoad = ref(true)
	const isInitialized = ref(false)

	// Data
	const artistsList = ref<Artist[]>([])
	const musicsList = ref<(Music & { artists: { name: string }[] })[]>([])

	// Adding state
	const addingMusicId = ref<string | null>(null)

	// Edit name state
	const isEditingName = ref(false)
	const editingName = ref('')

	// Settings modal
	const isSettingsModalOpen = ref(false)
	const settingsName = ref('')
	const settingsDescription = ref('')
	const settingsIsPublic = ref(false)
	const isSavingSettings = ref(false)

	// Drag and drop - synchroniser localRankingItems avec rankingItems
	watch(rankingItems, (items) => {
		localRankingItems.value = [...items]
	}, { immediate: true })

	// Computed
	const hasMore = computed(() => currentPage.value <= totalPages.value)

	// Menu options
	const availableYears = [2020, 2021, 2022, 2023, 2024, 2025]
	const availableStyles = [
		'K-Pop',
		'K-Hiphop',
		'K-R&B',
		'K-Ballad',
		'K-Rap',
		'K-Rock',
		'K-Indie',
		'K-Soul',
		'Korean Trot',
		'J-Pop',
		'J-Hiphop',
		'J-R&B',
		'J-Rock',
		'C-Pop',
		'C-Hiphop',
		'C-Rap',
		'Mando-Pop',
		'Mando-Hiphop',
		'Thai-Pop',
		'Thai-Hiphop',
		'Thai-Rap',
		'Thai-R&B',
		'Pop',
		'R&B',
	]

	const artistsForMenu = computed((): ArtistMenuItem[] => {
		return artistsList.value.map((artist) => ({
			id: artist.id,
			label: artist.name,
			name: artist.name,
			description: artist.description ?? undefined,
			image: artist.image,
		}))
	})

	const yearsForMenu = computed(() => {
		return availableYears.map((year) => ({
			value: year,
			label: year.toString(),
		})) as YearMenuItem[]
	})

	const stylesForMenu = computed(() => {
		return availableStyles.map((style) => ({
			value: style,
			label: style,
		})) as StyleMenuItem[]
	})

	// Load ranking
	const loadRanking = async () => {
		isLoadingRanking.value = true
		ranking.value = await getRankingById(rankingId.value)
		isLoadingRanking.value = false

		if (!ranking.value) {
			navigateTo('/ranking')
		}
	}

	// Load musics
	const loadMusics = async (isFirstCall = false): Promise<void> => {
		if (loading.value) return
		loading.value = true

		try {
			if (isFirstCall) {
				currentPage.value = 1
				musicsList.value = []
				firstLoad.value = true
			} else {
				firstLoad.value = false
			}

			const result = await getMusicsByPage(currentPage.value, limit, {
				search: search.value || undefined,
				artistIds: selectedArtists.value.length > 0 ? selectedArtists.value : undefined,
				years: selectedYears.value.length > 0 ? selectedYears.value : undefined,
				styles: selectedStyles.value.length > 0 ? selectedStyles.value : undefined,
				orderBy: 'date',
				orderDirection: orderDirection.value,
				ismv: isMv.value === true ? true : undefined,
			})

			totalMusics.value = result.total
			totalPages.value = result.totalPages

			const newMusics = result.musics.map((m) => ({
				...m,
				artists: m.artists || [],
			}))

			if (isFirstCall) {
				musicsList.value = newMusics
				currentPage.value = 2
			} else {
				musicsList.value = [...musicsList.value, ...newMusics]
				currentPage.value++
			}
		} catch (error) {
			console.error('Error loading music:', error)
		} finally {
			loading.value = false
		}
	}

	const loadMore = async () => {
		if (loading.value || !hasMore.value || !isInitialized.value) return

		// Vérifier que le conteneur est scrollable et qu'on est proche du bas
		const container = scrollContainer.value
		if (!container) return

		const { scrollTop, scrollHeight, clientHeight } = container
		const distanceFromBottom = scrollHeight - scrollTop - clientHeight

		// Ne charger que si on est vraiment proche du bas (moins de 300px)
		if (distanceFromBottom > 300) return

		await loadMusics(false)
	}

	const loadAllMusics = async (): Promise<void> => {
		while (hasMore.value && !loading.value) {
			await loadMusics(false)
		}
	}

	// Setup infinite scroll avec événement scroll manuel
	onMounted(() => {
		const container = scrollContainer.value
		if (container) {
			container.addEventListener('scroll', loadMore)
		}
	})

	onUnmounted(() => {
		const container = scrollContainer.value
		if (container) {
			container.removeEventListener('scroll', loadMore)
		}
	})

	// Helpers
	const formatArtists = (artists: { name: string }[] = []) => {
		return artists.map((a) => a.name).join(', ') || 'Artiste inconnu'
	}

	const formatDuration = (seconds: number): string => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	const formatDate = (dateString: string | null | undefined): string => {
		if (!dateString) return ''
		const date = new Date(dateString)
		return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
	}

	const getMusicThumbnail = (music: Music): string => {
		if (music.thumbnails && Array.isArray(music.thumbnails)) {
			return (music.thumbnails as any)[2]?.url || (music.thumbnails as any)[0]?.url || ''
		}
		return ''
	}

	const getMusicThumbnailFromList = (music: Music & { artists: { name: string }[] }): string => {
		if (music.thumbnails && Array.isArray(music.thumbnails)) {
			return (music.thumbnails as any)[2]?.url || (music.thumbnails as any)[0]?.url || ''
		}
		return ''
	}

	const isMusicInCurrentRanking = (musicId: string): boolean => {
		return rankingItems.value.some((item) => item.music_id === musicId)
	}

	// Actions
	const toggleMusicInRanking = async (music: Music) => {
		if (addingMusicId.value) return

		const isInRanking = isMusicInCurrentRanking(music.id)
		addingMusicId.value = music.id

		if (isInRanking) {
			// Retirer de la liste locale immédiatement
			if (ranking.value) {
				ranking.value.items = ranking.value.items.filter((item) => item.music_id !== music.id)
				localRankingItems.value = [...ranking.value.items]
			}
			// Supprimer en arrière-plan
			removeMusicFromRanking(rankingId.value, music.id)
		} else {
			// Ajouter à la liste locale immédiatement
			const newItem = await addMusicToRanking(rankingId.value, music.id)
			if (newItem && ranking.value) {
				const itemWithMusic = {
					...newItem,
					music: {
						...music,
						artists: music.artists || [],
					},
				} as UserRankingItem & { music: Music }
				ranking.value.items = [...ranking.value.items, itemWithMusic]
				localRankingItems.value = [...ranking.value.items]
			}
		}

		addingMusicId.value = null
	}

	const removeFromRanking = async (musicId: string) => {
		// Retirer de la liste locale immédiatement
		if (ranking.value) {
			ranking.value.items = ranking.value.items.filter((item) => item.music_id !== musicId)
			localRankingItems.value = [...ranking.value.items]
		}
		// Supprimer en arrière-plan
		removeMusicFromRanking(rankingId.value, musicId)
	}

	// Play music
	const handlePlayMusic = (music: Music) => {
		if (!music.id_youtube_music) return
		addToPlaylist(music.id_youtube_music, music.title || music.name || '', formatArtists(music.artists || []))
	}

	const isCurrentlyPlaying = (videoId: string | null | undefined): boolean => {
		if (!videoId) return false
		return isPlayingVideo.value && idYoutubeVideo.value === videoId
	}

	// Edit name
	const startEditName = () => {
		editingName.value = ranking.value?.name || ''
		isEditingName.value = true
	}

	const saveName = async () => {
		if (editingName.value.trim() && editingName.value !== ranking.value?.name) {
			await updateRanking(rankingId.value, { name: editingName.value.trim() })
			await loadRanking()
		}
		isEditingName.value = false
	}

	const cancelEditName = () => {
		isEditingName.value = false
	}

	// Toggle public
	const togglePublic = async () => {
		if (!ranking.value) return
		await updateRanking(rankingId.value, { is_public: !ranking.value.is_public })
		await loadRanking()
	}

	// Settings modal
	const openSettingsModal = () => {
		if (!ranking.value) return
		settingsName.value = ranking.value.name
		settingsDescription.value = ranking.value.description || ''
		settingsIsPublic.value = ranking.value.is_public
		isSettingsModalOpen.value = true
	}

	const saveSettings = async () => {
		isSavingSettings.value = true
		await updateRanking(rankingId.value, {
			name: settingsName.value.trim(),
			description: settingsDescription.value.trim() || null,
			is_public: settingsIsPublic.value,
		})
		await loadRanking()
		isSavingSettings.value = false
		isSettingsModalOpen.value = false
	}

	// Drag and drop - appelé quand le drag est terminé
	const onDragEnd = async () => {
		// Mettre à jour les positions dans la base de données
		const newPositions = localRankingItems.value.map((item, index) => ({
			id: item.id,
			position: index + 1,
		}))

		// Mettre à jour l'état local du ranking sans recharger
		if (ranking.value) {
			ranking.value.items = [...localRankingItems.value]
		}

		// Sauvegarder en arrière-plan sans attendre
		reorderRankingItems(rankingId.value, newPositions)
	}

	// Filter functions
	const resetFilters = () => {
		search.value = ''
		selectedArtists.value = []
		selectedArtistsWithLabel.value = []
		selectedYears.value = []
		selectedYearsWithLabel.value = []
		selectedStyles.value = []
		selectedStylesWithLabel.value = []
		isMv.value = false
		loadMusics(true)
	}

	const toggleOrderDirection = () => {
		orderDirection.value = orderDirection.value === 'desc' ? 'asc' : 'desc'
		loadMusics(true)
	}

	// Watchers
	watch(selectedArtistsWithLabel, (newVal: ArtistMenuItem[]) => {
		selectedArtists.value = newVal.map((artist) => artist.id)
	})

	watch(selectedYearsWithLabel, (newVal: YearMenuItem[]) => {
		selectedYears.value = newVal.map((year) => year.value)
	})

	watch(selectedStylesWithLabel, (newVal: StyleMenuItem[]) => {
		selectedStyles.value = newVal.map((style) => style.value)
	})

	watch([selectedArtists, selectedYears, selectedStyles, isMv], async () => {
		await loadMusics(true)
	})

	// Debounced search
	const debouncedSearch = useDebounceFn(() => {
		loadMusics(true)
	}, 300)

	watch(search, () => {
		debouncedSearch()
	})

	// Initial load
	onMounted(async () => {
		console.log('[ranking/music/[id]] onMounted - rankingId:', rankingId.value)
		await Promise.all([
			loadRanking(),
			getAllArtists({ isActive: true }).then((artists) => {
				artistsList.value = artists
			}),
		])
		console.log('[ranking/music/[id]] After loadRanking - ranking:', ranking.value)
		await loadMusics(true)
		// Activer l'infinite scroll après le premier chargement
		isInitialized.value = true
	})

	definePageMeta({
		middleware: ['auth'],
	})
</script>
