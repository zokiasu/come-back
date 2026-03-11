<script setup lang="ts">
	import type { Artist, ArtistMenuItem, Music, Release } from '~/types'
	import { useSupabaseMusic } from '~/composables/Supabase/useSupabaseMusic'

	type DashboardMusic = Music & {
		artists: Artist[]
		releases: Release[]
	}

	type ReleaseSearchItem = Pick<Release, 'id' | 'name' | 'image' | 'date'> & {
		artists?: Artist[]
	}

	type ThumbnailLike = {
		url?: string | null
	}

	const toast = useToast()
	const { getAuthHeaders } = useApiAuthHeaders()
	const { getMusicsByPage, updateMusic, updateMusicReleases, deleteMusic } =
		useSupabaseMusic()

	const musicsList = ref<DashboardMusic[]>([])
	const isLoading = ref(false)
	const totalMusics = ref(0)

	const search = ref('')
	const yearFilter = ref('')
	const mvFilter = ref<'all' | 'mv' | 'audio'>('all')
	const verifiedFilter = ref<'all' | 'verified' | 'pending'>('all')
	const selectedArtistFilter = ref<Artist | ArtistMenuItem | undefined>(undefined)

	const sortColumn = ref<'date' | 'name' | 'release_year' | 'created_at'>('date')
	const sortDirection = ref<'asc' | 'desc'>('desc')

	const currentPage = ref(1)
	const pageSizeValue = ref(20)
	const totalPages = computed(() => Math.ceil(totalMusics.value / pageSizeValue.value))

	const isEditModalOpen = ref(false)
	const editingMusic = ref<DashboardMusic | null>(null)
	const isSaving = ref(false)
	const isReleaseSearchLoading = ref(false)
	const releaseSearch = ref('')
	const releaseSearchResults = ref<ReleaseSearchItem[]>([])
	const selectedReleaseItems = ref<ReleaseSearchItem[]>([])
	const searchAllReleases = ref(false)
	const latestReleaseSearchRequestId = ref(0)
	const editForm = reactive({
		name: '',
		id_youtube_music: '',
		date: '',
		release_year: null as number | null,
		duration: null as number | null,
		ismv: false,
		verified: true,
	})

	const isDeleteModalOpen = ref(false)
	const deletingMusic = ref<DashboardMusic | null>(null)

	const verifiedOptions: { label: string; id: 'all' | 'verified' | 'pending' }[] = [
		{ label: 'All statuses', id: 'all' },
		{ label: 'Verified', id: 'verified' },
		{ label: 'Pending', id: 'pending' },
	]

	const mvOptions: { label: string; id: 'all' | 'mv' | 'audio' }[] = [
		{ label: 'All tracks', id: 'all' },
		{ label: 'MVs only', id: 'mv' },
		{ label: 'Audio only', id: 'audio' },
	]

	const sortOptions: {
		label: string
		id: 'date' | 'name' | 'release_year' | 'created_at'
	}[] = [
		{ label: 'Release date', id: 'date' },
		{ label: 'Name', id: 'name' },
		{ label: 'Year', id: 'release_year' },
		{ label: 'Created date', id: 'created_at' },
	]

	const pageSizeOptions: { label: string; id: number }[] = [
		{ label: '20 per page', id: 20 },
		{ label: '50 per page', id: 50 },
		{ label: '100 per page', id: 100 },
	]

	const artistFilterModel = computed<Artist | ArtistMenuItem | null>({
		get: () => selectedArtistFilter.value ?? null,
		set: (nextArtist) => {
			selectedArtistFilter.value = nextArtist ?? undefined
		},
	})

	const selectedArtistLabel = computed(() => {
		if (!selectedArtistFilter.value) return ''
		return 'label' in selectedArtistFilter.value
			? selectedArtistFilter.value.label
			: selectedArtistFilter.value.name
	})

	const stats = computed(() => {
		const mvCount = musicsList.value.filter((music) => music.ismv).length
		const pendingCount = musicsList.value.filter((music) => !music.verified).length

		return {
			total: totalMusics.value,
			loaded: musicsList.value.length,
			mvCount,
			pendingCount,
		}
	})

	const normalizeMusics = (items: Music[]): DashboardMusic[] => {
		return items.map((item) => ({
			...item,
			artists: Array.isArray(item.artists) ? item.artists : [],
			releases: Array.isArray(item.releases) ? item.releases : [],
		}))
	}

	const extractThumbnailUrl = (thumbnails: unknown): string | null => {
		if (!Array.isArray(thumbnails)) return null

		const withUrl = thumbnails.find(
			(thumbnail): thumbnail is ThumbnailLike =>
				typeof thumbnail === 'object' &&
				thumbnail !== null &&
				typeof (thumbnail as ThumbnailLike).url === 'string',
		)

		return withUrl?.url || null
	}

	const getMusicImage = (music: DashboardMusic) => {
		return extractThumbnailUrl(music.thumbnails) || music.releases[0]?.image || null
	}

	const formatDate = (dateString: string | null) => {
		if (!dateString) return '-'
		return new Date(dateString).toLocaleDateString('sv-SE')
	}

	const formatDuration = (duration: number | null) => {
		if (!duration || duration <= 0) return '-'
		const minutes = Math.floor(duration / 60)
		const seconds = duration % 60
		return `${minutes}:${seconds.toString().padStart(2, '0')}`
	}

	const formatArtists = (artists: Artist[]) => {
		if (!artists.length) return '-'
		return artists.map((artist) => artist.name).join(', ')
	}

	const formatReleaseDate = (dateString: string | null) => {
		if (!dateString) return ''
		return new Date(dateString).toLocaleDateString('sv-SE')
	}

	const getMusicDestination = (music: DashboardMusic) => {
		if (music.releases[0]?.id) return `/release/${music.releases[0].id}`
		if (music.artists[0]?.id) return `/artist/${music.artists[0].id}`
		return '/music'
	}

	const editingMusicImage = computed(() => {
		if (!editingMusic.value) return null
		return getMusicImage(editingMusic.value)
	})

	const fetchMusics = async () => {
		isLoading.value = true

		try {
			const result = await getMusicsByPage(currentPage.value, pageSizeValue.value, {
				search: search.value || undefined,
				artistIds: selectedArtistFilter.value ? [selectedArtistFilter.value.id] : undefined,
				years: yearFilter.value ? [Number(yearFilter.value)] : undefined,
				verified:
					verifiedFilter.value === 'all'
						? undefined
						: verifiedFilter.value === 'verified',
				ismv:
					mvFilter.value === 'all' ? undefined : mvFilter.value === 'mv',
				orderBy: sortColumn.value,
				orderDirection: sortDirection.value,
			})

			musicsList.value = normalizeMusics(result.musics)
			totalMusics.value = result.total
		} catch (error) {
			console.error('Error while fetching musics:', error)
			toast.add({
				title: 'Error',
				description: 'Error while loading music',
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	const formatDateForInput = (dateString: string | null) => {
		if (!dateString) return ''

		try {
			const date = new Date(dateString)
			if (Number.isNaN(date.getTime())) return ''
			return date.toISOString().split('T')[0] || ''
		} catch {
			return ''
		}
	}

	const syncEditForm = (music: DashboardMusic) => {
		editForm.name = music.name || ''
		editForm.id_youtube_music = music.id_youtube_music || ''
		editForm.date = formatDateForInput(music.date)
		editForm.release_year = music.release_year || null
		editForm.duration = music.duration || null
		editForm.ismv = Boolean(music.ismv)
		editForm.verified = Boolean(music.verified)
		selectedReleaseItems.value = music.releases.map((release) => ({
			id: release.id,
			name: release.name,
			image: release.image,
			date: release.date,
			artists: undefined,
		}))
		releaseSearch.value = ''
		releaseSearchResults.value = []
		searchAllReleases.value = false
	}

	const openEditModal = (music: DashboardMusic) => {
		editingMusic.value = music
		syncEditForm(music)
		isEditModalOpen.value = true
	}

	const closeEditModal = () => {
		isEditModalOpen.value = false
		editingMusic.value = null
		releaseSearch.value = ''
		releaseSearchResults.value = []
		selectedReleaseItems.value = []
		searchAllReleases.value = false
	}

	const linkedArtistIds = computed(() => {
		return editingMusic.value?.artists.map((artist) => artist.id).filter(Boolean) || []
	})

	const searchReleasesForEdit = async (query: string) => {
		const trimmedQuery = query.trim()

		if (!isEditModalOpen.value || trimmedQuery.length < 2) {
			releaseSearchResults.value = []
			isReleaseSearchLoading.value = false
			return
		}

		const requestId = ++latestReleaseSearchRequestId.value
		isReleaseSearchLoading.value = true

		try {
			const result = await $fetch<{ releases: ReleaseSearchItem[] }>(
				'/api/admin/releases/search',
				{
					headers: getAuthHeaders(),
					query: {
						search: trimmedQuery,
						limit: 8,
						artistIds:
							searchAllReleases.value || linkedArtistIds.value.length === 0
								? undefined
								: linkedArtistIds.value.join(','),
					},
				},
			)

			if (requestId !== latestReleaseSearchRequestId.value) return

			const selectedIds = new Set(selectedReleaseItems.value.map((release) => release.id))
			releaseSearchResults.value = result.releases
				.filter((release) => !selectedIds.has(release.id))
				.map((release) => ({
					id: release.id,
					name: release.name,
					image: release.image,
					date: release.date,
					artists: release.artists,
				}))
		} catch (error) {
			if (requestId !== latestReleaseSearchRequestId.value) return
			console.error('Error while searching releases:', error)
			releaseSearchResults.value = []
		} finally {
			if (requestId === latestReleaseSearchRequestId.value) {
				isReleaseSearchLoading.value = false
			}
		}
	}

	watch(releaseSearch, async (value) => {
		await searchReleasesForEdit(value)
	})

	watch(searchAllReleases, async () => {
		if (releaseSearch.value.trim().length < 2) return
		await searchReleasesForEdit(releaseSearch.value)
	})

	const addReleaseToMusic = (release: ReleaseSearchItem) => {
		if (selectedReleaseItems.value.some((item) => item.id === release.id)) return

		selectedReleaseItems.value = [...selectedReleaseItems.value, release]
		releaseSearch.value = ''
		releaseSearchResults.value = []
	}

	const removeReleaseFromMusic = (releaseId: string) => {
		selectedReleaseItems.value = selectedReleaseItems.value.filter(
			(release) => release.id !== releaseId,
		)
	}

	const saveMusic = async () => {
		if (!editingMusic.value) return

		if (!editForm.name.trim()) {
			toast.add({
				title: 'Music title is required',
				color: 'error',
			})
			return
		}

		isSaving.value = true

		try {
			const updatedMusic = await updateMusic(editingMusic.value.id, {
				name: editForm.name.trim(),
				id_youtube_music: editForm.id_youtube_music.trim() || null,
				date: editForm.date || null,
				release_year: editForm.release_year,
				duration: editForm.duration,
				ismv: editForm.ismv,
				verified: editForm.verified,
				updated_at: new Date().toISOString(),
			})

			if (!updatedMusic) {
				throw new Error('Update failed')
			}

			const relationsUpdated = await updateMusicReleases(
				editingMusic.value.id,
				selectedReleaseItems.value.map((release) => release.id),
			)

			if (!relationsUpdated) {
				throw new Error('Release relations update failed')
			}

			toast.add({
				title: 'Music updated successfully',
				color: 'success',
			})

			closeEditModal()
			await fetchMusics()
		} catch (error) {
			console.error('Error while updating music:', error)
			toast.add({
				title: 'Error',
				description: 'Error while updating music',
				color: 'error',
			})
		} finally {
			isSaving.value = false
		}
	}

	const openDeleteModal = (music: DashboardMusic) => {
		deletingMusic.value = music
		isDeleteModalOpen.value = true
	}

	const confirmDelete = async () => {
		if (!deletingMusic.value) return

		try {
			const success = await deleteMusic(deletingMusic.value.id)
			if (!success) {
				throw new Error('Delete failed')
			}

			toast.add({
				title: 'Music deleted',
				color: 'success',
			})

			isDeleteModalOpen.value = false
			deletingMusic.value = null
			await fetchMusics()
		} catch (error) {
			console.error('Error while deleting music:', error)
			toast.add({
				title: 'Error',
				description: 'Error while deleting music',
				color: 'error',
			})
		}
	}

	const toggleSortDirection = () => {
		sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
	}

	const clearArtistFilter = () => {
		selectedArtistFilter.value = undefined
	}

	const isFilterChange = ref(false)

	const debouncedFetch = useDebounce(() => {
		isFilterChange.value = true
		currentPage.value = 1
		fetchMusics()
	}, 300)

	watch(search, () => {
		debouncedFetch()
	})

	watch(
		[
			() => selectedArtistFilter.value?.id || '',
			yearFilter,
			mvFilter,
			verifiedFilter,
			sortColumn,
			sortDirection,
			pageSizeValue,
		],
		async () => {
			isFilterChange.value = true
			currentPage.value = 1
			await nextTick()
			fetchMusics()
		},
	)

	watch(currentPage, () => {
		if (isFilterChange.value) {
			isFilterChange.value = false
			return
		}
		fetchMusics()
	})

	onMounted(async () => {
		await fetchMusics()
	})

	definePageMeta({
		middleware: ['admin'],
		layout: 'dashboard',
	})
</script>

<template>
	<div class="scrollBarLight h-full space-y-4 overflow-y-auto p-6">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
			<div class="flex items-center gap-4">
				<div>
					<h1 class="text-2xl font-bold">Music Management</h1>
					<p class="text-cb-tertiary-500 text-sm">
						{{ stats.loaded }} / {{ stats.total }} tracks loaded
					</p>
				</div>
				<UButton
					to="/music"
					icon="i-heroicons-arrow-top-right-on-square"
					size="sm"
					color="primary"
					variant="solid"
					class="text-white"
				>
					Open music explorer
				</UButton>
			</div>

			<div class="flex flex-wrap gap-2">
				<div class="bg-cb-quaternary-950 rounded-lg px-3 py-1.5 text-center">
					<p class="text-lg font-bold">{{ stats.total }}</p>
					<p class="text-cb-tertiary-500 text-xs">Total</p>
				</div>
				<div class="rounded-lg bg-cb-primary-900/20 px-3 py-1.5 text-center">
					<p class="text-lg font-bold text-cb-primary-900">{{ stats.mvCount }}</p>
					<p class="text-xs text-cb-primary-900/70">MVs</p>
				</div>
				<div
					v-if="stats.pendingCount > 0"
					class="rounded-lg bg-amber-900/30 px-3 py-1.5 text-center"
				>
					<p class="text-lg font-bold text-amber-400">{{ stats.pendingCount }}</p>
					<p class="text-xs text-amber-400/70">Pending</p>
				</div>
			</div>
		</div>

		<div class="bg-cb-quaternary-950 space-y-3 rounded-lg p-4">
			<div class="flex flex-wrap items-center gap-3">
				<UInput
					v-model="search"
					name="dashboard-music-search"
					placeholder="Search tracks..."
					icon="i-heroicons-magnifying-glass"
					class="w-full md:w-72"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>

				<ArtistSearchSelect
					v-model="artistFilterModel"
					placeholder="Filter by artist..."
					search-placeholder="Filter by artist..."
					loading-text="Searching artists..."
					idle-text="Type at least 2 characters to search artists."
					empty-text="No artists match your search."
					class="w-full md:w-72"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>

				<UInput
					v-model="yearFilter"
					name="dashboard-music-year-filter"
					type="number"
					:min="1900"
					:max="new Date().getFullYear() + 1"
					placeholder="Year"
					class="w-full md:w-32"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>

				<USelectMenu
					v-model="verifiedFilter"
					:items="verifiedOptions"
					value-key="id"
					class="w-full md:w-40"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>

				<USelectMenu
					v-model="mvFilter"
					:items="mvOptions"
					value-key="id"
					class="w-full md:w-40"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>

				<div class="flex items-center gap-2">
					<USelectMenu
						v-model="sortColumn"
						:items="sortOptions"
						value-key="id"
						class="w-full md:w-40"
						:ui="{ base: 'bg-cb-quinary-900' }"
					/>
					<UButton
						:icon="
							sortDirection === 'asc'
								? 'i-heroicons-bars-arrow-up'
								: 'i-heroicons-bars-arrow-down'
						"
						color="neutral"
						variant="ghost"
						@click="toggleSortDirection"
					/>
				</div>

				<USelectMenu
					v-model="pageSizeValue"
					:items="pageSizeOptions"
					value-key="id"
					class="w-full md:w-36"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>

				<UButton
					icon="i-heroicons-arrow-path"
					color="neutral"
					variant="ghost"
					:loading="isLoading"
					@click="fetchMusics"
				/>
			</div>

			<div v-if="selectedArtistFilter" class="flex items-center gap-3">
				<UBadge color="neutral" variant="subtle">
					Artist: {{ selectedArtistLabel }}
				</UBadge>
				<UButton label="Clear artist" color="error" variant="ghost" size="sm" @click="clearArtistFilter" />
			</div>
		</div>

		<div class="bg-cb-quaternary-950 overflow-hidden rounded-lg">
			<div v-if="isLoading && musicsList.length === 0" class="space-y-2 p-4">
				<SkeletonDefault v-for="i in 6" :key="i" class="h-24 w-full rounded-lg" />
			</div>

			<div v-else-if="!isLoading && musicsList.length === 0" class="py-16 text-center">
				<UIcon
					name="i-heroicons-musical-note"
					class="text-cb-tertiary-500 mx-auto size-16 opacity-50"
				/>
				<p class="text-cb-tertiary-500 mt-4">No music found</p>
			</div>

			<div v-else class="divide-cb-quinary-900 divide-y">
				<div
					v-for="music in musicsList"
					:key="music.id"
					class="hover:bg-cb-quinary-900/30 group flex items-center gap-4 p-3 transition-colors"
				>
					<NuxtLink :to="getMusicDestination(music)" class="shrink-0">
						<NuxtImg
							v-if="getMusicImage(music)"
							:src="getMusicImage(music) || ''"
							:alt="music.name"
							format="webp"
							class="size-16 rounded-lg object-cover"
						/>
						<div
							v-else
							class="bg-cb-quinary-900 flex size-16 items-center justify-center rounded-lg"
						>
							<UIcon
								name="i-heroicons-musical-note"
								class="text-cb-tertiary-500 size-8"
							/>
						</div>
					</NuxtLink>

					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<p class="truncate font-semibold">
								{{ music.name }}
							</p>
							<UBadge v-if="music.ismv" color="primary" variant="subtle" size="xs">
								MV
							</UBadge>
							<UBadge v-if="!music.verified" color="warning" variant="subtle" size="xs">
								Pending
							</UBadge>
						</div>

						<p class="text-cb-tertiary-400 truncate text-sm">
							{{ formatArtists(music.artists) }}
						</p>

						<div class="text-cb-tertiary-500 mt-1 flex flex-wrap items-center gap-3 text-xs">
							<template v-if="music.releases[0]?.id">
								<NuxtLink
									:to="`/release/${music.releases[0].id}`"
									class="hover:text-cb-primary-900 transition-colors"
								>
									{{ music.releases[0].name }}
								</NuxtLink>
								<span
									v-if="music.releases.length > 1"
									class="text-cb-tertiary-400"
								>
									+{{ music.releases.length - 1 }} more
								</span>
							</template>
							<span v-else>No release linked</span>
							<span>{{ formatDate(music.date) }}</span>
							<span v-if="music.release_year">({{ music.release_year }})</span>
							<span>{{ formatDuration(music.duration) }}</span>
							<span v-if="music.id_youtube_music" class="truncate">
								YT: {{ music.id_youtube_music }}
							</span>
						</div>
					</div>

					<div
						class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
					>
						<UButton
							icon="i-heroicons-pencil-square"
							color="neutral"
							variant="ghost"
							size="sm"
							title="Edit music"
							aria-label="Edit music"
							@click="openEditModal(music)"
						/>
						<UButton
							icon="i-heroicons-trash"
							color="error"
							variant="ghost"
							size="sm"
							title="Delete music"
							aria-label="Delete music"
							@click="openDeleteModal(music)"
						/>
						<UButton
							:to="getMusicDestination(music)"
							icon="i-heroicons-arrow-top-right-on-square"
							color="neutral"
							variant="ghost"
							size="sm"
							target="_blank"
							title="Open linked page"
							aria-label="Open linked page"
						/>
					</div>
				</div>
			</div>

			<div
				v-if="totalPages > 1"
				class="border-cb-quinary-900 flex items-center justify-between border-t px-4 py-3"
			>
				<p class="text-cb-tertiary-500 text-sm">
					Page {{ currentPage }} of {{ totalPages }}
				</p>
				<UPagination
					v-model:page="currentPage"
					:total="totalMusics"
					:items-per-page="pageSizeValue"
				/>
			</div>
		</div>

		<UModal
			v-model:open="isEditModalOpen"
			title="Edit music"
			description="Update track metadata and manage the releases linked to this track."
			:ui="{
				content:
					'bg-cb-secondary-950 w-full max-w-6xl rounded-[28px] border border-cb-quinary-900/70 shadow-2xl',
			}"
		>
			<template #content>
				<div v-if="editingMusic" class="bg-cb-secondary-950 flex max-h-[90vh] flex-col overflow-hidden">
					<div class="border-cb-quinary-900/70 flex items-start justify-between gap-6 border-b px-6 py-5">
						<div class="flex min-w-0 items-start gap-4">
							<div
								v-if="editingMusicImage"
								class="bg-cb-quinary-900 h-20 w-20 shrink-0 overflow-hidden rounded-2xl"
							>
								<NuxtImg
									:src="editingMusicImage || ''"
									:alt="editingMusic.name"
									format="webp"
									class="h-full w-full object-cover"
								/>
							</div>
							<div
								v-else
								class="bg-cb-quinary-900 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl"
							>
								<UIcon
									name="i-heroicons-musical-note"
									class="text-cb-tertiary-500 size-10"
								/>
							</div>

							<div class="min-w-0 space-y-2">
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="truncate text-2xl font-bold">Edit music</h3>
									<UBadge v-if="editForm.ismv" color="primary" variant="subtle" size="xs">
										MV
									</UBadge>
									<UBadge
										v-if="!editForm.verified"
										color="warning"
										variant="subtle"
										size="xs"
									>
										Pending
									</UBadge>
								</div>
								<p class="truncate text-sm font-medium">{{ editingMusic.name }}</p>
								<p class="text-cb-tertiary-500 text-sm">
									{{ formatArtists(editingMusic.artists) }}
								</p>
								<div class="text-cb-tertiary-500 flex flex-wrap items-center gap-3 text-xs">
									<span>{{ selectedReleaseItems.length }} linked release(s)</span>
									<span v-if="editingMusic.id_youtube_music">
										YouTube: {{ editingMusic.id_youtube_music }}
									</span>
								</div>
							</div>
						</div>

						<UButton
							icon="i-heroicons-x-mark"
							color="neutral"
							variant="ghost"
							aria-label="Close edit music modal"
							@click="closeEditModal"
						/>
					</div>

					<div class="scrollBarLight flex-1 overflow-y-auto px-6 py-6">
						<div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_25rem]">
							<div class="space-y-6">
								<div class="bg-cb-quaternary-950 rounded-2xl border border-cb-quinary-900/70 p-5">
									<div class="mb-4 flex items-center justify-between gap-3">
										<div>
											<h4 class="font-semibold">Track details</h4>
											<p class="text-cb-tertiary-500 text-sm">
												Update the core metadata used across the app.
											</p>
										</div>
										<UButton
											:to="getMusicDestination(editingMusic)"
											icon="i-heroicons-arrow-top-right-on-square"
											color="neutral"
											variant="ghost"
											size="sm"
											target="_blank"
										>
											Open
										</UButton>
									</div>

									<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
										<UFormField label="Name" required>
											<UInput
												v-model="editForm.name"
												name="dashboard-edit-music-name"
												placeholder="Music name"
												class="w-full"
											/>
										</UFormField>

										<UFormField label="ID YouTube Music">
											<UInput
												v-model="editForm.id_youtube_music"
												name="dashboard-edit-music-youtube-id"
												placeholder="Ex: MLwTVTTVnU"
												class="w-full"
											/>
										</UFormField>
									</div>

									<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
										<UFormField label="Date">
											<UInput
												v-model="editForm.date"
												name="dashboard-edit-music-date"
												type="date"
												class="w-full"
											/>
										</UFormField>

										<UFormField label="Year">
											<UInput
												v-model.number="editForm.release_year"
												name="dashboard-edit-music-year"
												type="number"
												:min="1900"
												:max="new Date().getFullYear() + 1"
												class="w-full"
											/>
										</UFormField>

										<UFormField label="Duration (seconds)">
											<UInput
												v-model.number="editForm.duration"
												name="dashboard-edit-music-duration"
												type="number"
												min="1"
												placeholder="180"
												class="w-full"
											/>
										</UFormField>
									</div>
								</div>

								<div class="bg-cb-quaternary-950 rounded-2xl border border-cb-quinary-900/70 p-5">
									<h4 class="font-semibold">Artists</h4>
									<p class="text-cb-tertiary-500 mb-4 text-sm">
										Artists remain read-only here. Use the release editor when you need to
										change artist relations.
									</p>

									<div class="flex flex-wrap gap-2">
										<NuxtLink
											v-for="artist in editingMusic.artists"
											:key="artist.id"
											:to="`/artist/${artist.id}`"
											class="bg-cb-quinary-900 hover:bg-cb-quinary-800 rounded-full px-3 py-1.5 text-xs transition-colors"
										>
											{{ artist.name }}
										</NuxtLink>
										<span
											v-if="editingMusic.artists.length === 0"
											class="text-cb-tertiary-500 text-sm"
										>
											No artist linked
										</span>
									</div>
								</div>

								<div class="bg-cb-quaternary-950 rounded-2xl border border-cb-quinary-900/70 p-5">
									<h4 class="font-semibold">Flags</h4>
									<p class="text-cb-tertiary-500 mb-4 text-sm">
										Control how this track is surfaced across the app.
									</p>

									<div class="flex flex-wrap gap-4">
										<UCheckbox v-model="editForm.ismv" label="This track is an MV" />
										<UCheckbox v-model="editForm.verified" label="Verified track" />
									</div>
								</div>
							</div>

							<div class="space-y-4 xl:sticky xl:top-0 xl:self-start">
								<div class="bg-cb-quaternary-950 rounded-2xl border border-cb-quinary-900/70 p-5">
									<div class="mb-4 flex items-center justify-between gap-3">
										<div>
											<h4 class="font-semibold">Linked releases</h4>
											<p class="text-cb-tertiary-500 text-sm">
												Attach one or more releases to this track.
											</p>
										</div>
										<UBadge color="neutral" variant="subtle">
											{{ selectedReleaseItems.length }}
										</UBadge>
									</div>

									<UFormField label="Find releases">
										<UInput
											v-model="releaseSearch"
											name="dashboard-edit-music-release-search"
											icon="i-heroicons-magnifying-glass"
											placeholder="Search releases to link..."
											class="w-full"
											:ui="{ base: 'bg-cb-quinary-900' }"
										/>
									</UFormField>

									<div class="flex items-center justify-between gap-3 text-sm">
										<UCheckbox
											v-model="searchAllReleases"
											label="Search across all artists"
										/>
										<p
											v-if="!searchAllReleases && editingMusic.artists.length > 0"
											class="text-cb-tertiary-500 text-right"
										>
											Default scope: {{ formatArtists(editingMusic.artists) }}
										</p>
									</div>

									<div class="mt-4 space-y-3">
										<div class="bg-cb-secondary-950 rounded-xl border border-cb-quinary-900/70">
											<div class="border-cb-quinary-900/70 border-b px-4 py-3">
												<p class="text-sm font-medium">Selected releases</p>
											</div>
											<div class="scrollBarLight max-h-60 space-y-2 overflow-y-auto p-3">
												<div
													v-for="release in selectedReleaseItems"
													:key="release.id"
													class="bg-cb-quaternary-950 flex items-center gap-3 rounded-xl border border-cb-quinary-900/70 p-3"
												>
													<div
														class="bg-cb-quinary-900 h-12 w-12 shrink-0 overflow-hidden rounded-lg"
													>
														<NuxtImg
															v-if="release.image"
															:src="release.image"
															:alt="release.name"
															format="webp"
															class="h-full w-full object-cover"
														/>
														<div
															v-else
															class="flex h-full w-full items-center justify-center"
														>
															<UIcon
																name="i-heroicons-musical-note"
																class="text-cb-tertiary-500 size-5"
															/>
														</div>
													</div>

													<div class="min-w-0 flex-1">
														<NuxtLink
															:to="`/release/${release.id}`"
															class="hover:text-cb-primary-900 block truncate text-sm font-medium transition-colors"
														>
															{{ release.name }}
														</NuxtLink>
														<p class="text-cb-tertiary-500 truncate text-xs">
															{{ formatReleaseDate(release.date || null) }}
															<span v-if="release.artists?.length">
																· {{ formatArtists(release.artists) }}
															</span>
														</p>
													</div>

													<UButton
														icon="i-heroicons-x-mark"
														color="neutral"
														variant="ghost"
														size="xs"
														aria-label="Remove release"
														@click="removeReleaseFromMusic(release.id)"
													/>
												</div>

												<p
													v-if="selectedReleaseItems.length === 0"
													class="text-cb-tertiary-500 text-sm"
												>
													No release linked. Search and add one or more releases.
												</p>
											</div>
										</div>

										<div class="bg-cb-secondary-950 rounded-xl border border-cb-quinary-900/70">
											<div class="border-cb-quinary-900/70 border-b px-4 py-3">
												<p class="text-sm font-medium">Search results</p>
											</div>
											<div class="scrollBarLight max-h-72 overflow-y-auto">
												<div
													v-if="isReleaseSearchLoading"
													class="text-cb-tertiary-500 px-4 py-4 text-sm"
												>
													Searching releases...
												</div>
												<div
													v-else-if="releaseSearch.trim().length >= 2 && releaseSearchResults.length === 0"
													class="text-cb-tertiary-500 px-4 py-4 text-sm"
												>
													No release found for this search.
												</div>
												<div
													v-else-if="releaseSearch.trim().length < 2"
													class="text-cb-tertiary-500 px-4 py-4 text-sm"
												>
													Type at least 2 characters to search releases.
												</div>
												<button
													v-for="release in releaseSearchResults"
													:key="release.id"
													type="button"
													class="hover:bg-cb-primary-900/15 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
													@click="addReleaseToMusic(release)"
												>
													<div
														class="bg-cb-quinary-900 h-12 w-12 shrink-0 overflow-hidden rounded-lg"
													>
														<NuxtImg
															v-if="release.image"
															:src="release.image"
															:alt="release.name"
															format="webp"
															class="h-full w-full object-cover"
														/>
														<div
															v-else
															class="flex h-full w-full items-center justify-center"
														>
															<UIcon
																name="i-heroicons-musical-note"
																class="text-cb-tertiary-500 size-5"
															/>
														</div>
													</div>

													<div class="min-w-0 flex-1">
														<p class="truncate text-sm font-medium">
															{{ release.name }}
														</p>
														<p class="text-cb-tertiary-500 truncate text-xs">
															{{ formatReleaseDate(release.date || null) }}
															<span v-if="release.artists?.length">
																· {{ formatArtists(release.artists) }}
															</span>
														</p>
													</div>

													<UIcon
														name="i-heroicons-plus"
														class="text-cb-tertiary-500 size-4 shrink-0"
													/>
												</button>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div class="border-cb-quinary-900/70 flex justify-end gap-3 border-t px-6 py-5">
						<UButton
							color="neutral"
							variant="soft"
							:disabled="isSaving"
							@click="closeEditModal"
						>
							Cancel
						</UButton>
						<UButton :loading="isSaving" @click="saveMusic">Save</UButton>
					</div>
				</div>
			</template>
		</UModal>

		<UModal
			v-model:open="isDeleteModalOpen"
			title="Delete music"
			description="Confirm the permanent deletion of this track."
		>
			<template #content>
				<div class="bg-cb-secondary-950 p-6">
					<h3 class="text-lg font-bold">Delete music</h3>
					<p class="text-cb-tertiary-500 mt-2 text-sm">
						Delete
						<span class="font-semibold text-white">
							{{ deletingMusic?.name || 'this music' }}
						</span>
						?
					</p>

					<div class="mt-6 flex justify-end gap-3">
						<UButton
							color="neutral"
							variant="soft"
							@click="isDeleteModalOpen = false; deletingMusic = null"
						>
							Cancel
						</UButton>
						<UButton color="error" @click="confirmDelete">Delete</UButton>
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>
