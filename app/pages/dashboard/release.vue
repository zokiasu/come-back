<script setup lang="ts">
	import type { Release, ReleaseType, ArtistMenuItem } from '~/types'
	import { useSupabaseRelease } from '~/composables/Supabase/useSupabaseRelease'

	const { deleteRelease: deleteReleaseFunction, getReleasesByPage } = useSupabaseRelease()
	const toast = useToast()

	type DashboardRelease = {
		id: string
		name: string
		type: ReleaseType | null
		id_youtube_music: string | null
		date: string | null
		year: number | null
		verified: boolean | null
		image: string | null
		artists: Array<{ id: string; name: string }>
		musics: Array<{ id: string }>
	}
	type DashboardArtistLike = { id: string; name: string }
	type DashboardMusicLike = { id: string }

	// Data state
	const releasesList = ref<DashboardRelease[]>([])
	const isLoading = ref(false)
	const totalReleases = ref(0)

	// Filters state
	const search = ref('')
	const typeFilter = ref<ReleaseType | 'ALL'>('ALL')
	const verifiedFilter = ref<'all' | 'verified' | 'pending'>('all')
	const selectedArtists = ref<string[]>([])
	const selectedArtistsWithLabel = ref<ArtistMenuItem[]>([])

	// Sorting state
	const sortColumn = ref<keyof Release>('date')
	const sortDirection = ref<'asc' | 'desc'>('desc')

	// Pagination state
	const currentPage = ref(1)
	const pageSizeValue = ref(20)
	const totalPages = computed(() => Math.ceil(totalReleases.value / pageSizeValue.value))

	// Edit modal state
	const isEditModalOpen = ref(false)
	const editingRelease = ref<DashboardRelease | null>(null)

	// Delete modal state
	const isDeleteModalOpen = ref(false)
	const deletingReleaseId = ref<string | null>(null)

	// Select menu options
	const typeOptions: { label: string; id: string }[] = [
		{ label: 'All types', id: 'ALL' },
		{ label: 'Single', id: 'SINGLE' },
		{ label: 'Album', id: 'ALBUM' },
		{ label: 'EP', id: 'EP' },
	]

	const verifiedOptions: { label: string; id: string }[] = [
		{ label: 'All statuses', id: 'all' },
		{ label: 'Verified', id: 'verified' },
		{ label: 'Pending', id: 'pending' },
	]

	const sortOptions: { label: string; id: string }[] = [
		{ label: 'Release date', id: 'date' },
		{ label: 'Name', id: 'name' },
		{ label: 'Type', id: 'type' },
		{ label: 'Year', id: 'year' },
		{ label: 'Created date', id: 'created_at' },
	]

	const pageSizeOptions: { label: string; id: number }[] = [
		{ label: '20 per page', id: 20 },
		{ label: '50 per page', id: 50 },
		{ label: '100 per page', id: 100 },
	]

	// Statistics
	const stats = computed(() => {
		let singles = 0
		let albums = 0
		let eps = 0
		let pending = 0

		for (const r of releasesList.value) {
			if (r.type === 'SINGLE') singles++
			if (r.type === 'ALBUM') albums++
			if (r.type === 'EP') eps++
			if (!r.verified) pending++
		}

		return {
			total: totalReleases.value,
			loaded: releasesList.value.length,
			singles,
			albums,
			eps,
			pending,
		}
	})

	const normalizeReleases = (items: unknown[]): DashboardRelease[] => {
		return items.map((item) => {
			const record = item as Record<string, unknown>
			const artists = Array.isArray(record.artists)
				? record.artists.filter(
						(artist): artist is DashboardArtistLike =>
							typeof artist === 'object' &&
							artist !== null &&
							typeof (artist as { id?: unknown }).id === 'string' &&
							typeof (artist as { name?: unknown }).name === 'string',
					)
				: []
			const musics = Array.isArray(record.musics)
				? record.musics.filter(
						(music): music is DashboardMusicLike =>
							typeof music === 'object' &&
							music !== null &&
							typeof (music as { id?: unknown }).id === 'string',
					)
				: []

			return {
				id: String(record.id ?? ''),
				name: String(record.name ?? ''),
				type: (record.type as ReleaseType | null) ?? null,
				id_youtube_music: (record.id_youtube_music as string | null) ?? null,
				date: (record.date as string | null) ?? null,
				year: (record.year as number | null) ?? null,
				verified: (record.verified as boolean | null) ?? null,
				image: (record.image as string | null) ?? null,
				artists,
				musics,
			}
		})
	}

	// Fetch releases
	const fetchReleases = async () => {
		isLoading.value = true

		const filters = {
			search: search.value || undefined,
			type: typeFilter.value === 'ALL' ? undefined : typeFilter.value,
			orderBy: sortColumn.value,
			orderDirection: sortDirection.value,
			artistIds: selectedArtists.value.length > 0 ? selectedArtists.value : undefined,
			verified:
				verifiedFilter.value === 'all' ? undefined : verifiedFilter.value === 'verified',
		}

		console.warn('🔍 fetchReleases appelé avec:', {
			page: currentPage.value,
			pageSize: pageSizeValue.value,
			filters,
			rawValues: {
				typeFilter: typeFilter.value,
				verifiedFilter: verifiedFilter.value,
				sortColumn: sortColumn.value,
				sortDirection: sortDirection.value,
				search: search.value,
				selectedArtists: selectedArtists.value,
			},
		})

		try {
			const result = await getReleasesByPage(
				currentPage.value,
				pageSizeValue.value,
				filters,
			)

			releasesList.value = normalizeReleases(result.releases)
			totalReleases.value = result.total
		} catch (error) {
			console.error('Error while fetching releases:', error)
			toast.add({
				title: 'Error',
				description: 'Error while loading releases',
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	// Format date
	const formatDate = (dateString: string | null) => {
		if (!dateString) return '-'
		return new Date(dateString).toLocaleDateString('sv-SE')
	}

	// Format artists
	const formatArtists = (artists: Array<{ name: string }> | undefined) => {
		if (!artists || artists.length === 0) return '-'
		return artists.map((a) => a.name).join(', ')
	}

	// Get type badge color
	const getTypeBadgeColor = (type: string | null) => {
		switch (type) {
			case 'ALBUM':
				return 'primary'
			case 'SINGLE':
				return 'success'
			case 'EP':
				return 'warning'
			default:
				return 'neutral'
		}
	}

	// Check if year mismatch with date
	const hasYearMismatch = (release: { date: string | null; year: number | null }) => {
		if (!release.date || !release.year) return false
		const dateYear = new Date(release.date).getFullYear()
		return dateYear !== release.year
	}

	const isReleaseFlagged = (release: {
		verified: boolean | null
		date: string | null
		year: number | null
	}) => {
		return !release.verified || hasYearMismatch(release)
	}

	// Toggle sort direction
	const toggleSortDirection = () => {
		sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
	}

	// Edit modal
	const openEditModal = (release: DashboardRelease) => {
		editingRelease.value = release
		isEditModalOpen.value = true
	}

	const closeEditModal = () => {
		isEditModalOpen.value = false
		editingRelease.value = null
	}

	const handleReleaseSaved = () => {
		closeEditModal()
		fetchReleases()
	}

	// Delete modal
	const openDeleteModal = (releaseId: string) => {
		deletingReleaseId.value = releaseId
		isDeleteModalOpen.value = true
	}

	const confirmDelete = async () => {
		if (!deletingReleaseId.value) return

		try {
			const success = await deleteReleaseFunction(deletingReleaseId.value)
			if (success) {
				toast.add({
					title: 'Success',
					description: 'Release deleted',
					color: 'success',
				})
				fetchReleases()
			} else {
				toast.add({
					title: 'Error',
					description: 'Error while deleting release',
					color: 'error',
				})
			}
		} catch (error) {
			console.error('Erreur lors de la suppression:', error)
			toast.add({
				title: 'Error',
				description: 'Error while deleting release',
				color: 'error',
			})
		} finally {
			isDeleteModalOpen.value = false
			deletingReleaseId.value = null
		}
	}

	// Clear artist selection
	const clearArtistSelection = () => {
		selectedArtists.value = []
		selectedArtistsWithLabel.value = []
	}

	// Sync selectedArtistsWithLabel with selectedArtists
	watch(selectedArtistsWithLabel, (newVal: ArtistMenuItem[]) => {
		selectedArtists.value = newVal.map((artist) => artist.id)
	})

	// Track if filter change triggered the page reset
	const isFilterChange = ref(false)

	// Debounced search
	const debouncedFetch = useDebounce(() => {
		isFilterChange.value = true
		currentPage.value = 1
		fetchReleases()
	}, 300)

	watch(search, () => {
		debouncedFetch()
	})

	watch(
		[
			typeFilter,
			verifiedFilter,
			selectedArtists,
			sortColumn,
			sortDirection,
			pageSizeValue,
		],
		async () => {
			isFilterChange.value = true
			currentPage.value = 1
			await nextTick()
			fetchReleases()
		},
	)

	// Watch page changes from pagination
	watch(currentPage, () => {
		if (isFilterChange.value) {
			isFilterChange.value = false
			return
		}
		fetchReleases()
	})

	// Initial load
	onMounted(async () => {
		fetchReleases()
	})

	definePageMeta({
		middleware: ['admin'],
		layout: 'dashboard',
	})
</script>

<template>
	<div class="scrollBarLight h-full space-y-4 overflow-y-auto p-6">
		<!-- Header with stats -->
		<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
			<div class="flex items-center gap-4">
				<div>
					<h1 class="text-2xl font-bold">Release Management</h1>
					<p class="text-cb-tertiary-500 text-sm">
						{{ stats.loaded }} / {{ stats.total }} releases loaded
					</p>
				</div>
			</div>

			<!-- Stats cards -->
			<div class="flex flex-wrap gap-2">
				<div class="bg-cb-quaternary-950 rounded-lg px-3 py-1.5 text-center">
					<p class="text-lg font-bold">{{ stats.total }}</p>
					<p class="text-cb-tertiary-500 text-xs">Total</p>
				</div>
				<div class="rounded-lg bg-green-900/30 px-3 py-1.5 text-center">
					<p class="text-lg font-bold text-green-400">{{ stats.singles }}</p>
					<p class="text-xs text-green-400/70">Singles</p>
				</div>
				<div class="rounded-lg bg-blue-900/30 px-3 py-1.5 text-center">
					<p class="text-lg font-bold text-blue-400">{{ stats.albums }}</p>
					<p class="text-xs text-blue-400/70">Albums</p>
				</div>
				<div class="rounded-lg bg-amber-900/30 px-3 py-1.5 text-center">
					<p class="text-lg font-bold text-amber-400">{{ stats.eps }}</p>
					<p class="text-xs text-amber-400/70">EPs</p>
				</div>
				<div
					v-if="stats.pending > 0"
					class="rounded-lg bg-red-900/30 px-3 py-1.5 text-center"
				>
					<p class="text-lg font-bold text-red-400">{{ stats.pending }}</p>
					<p class="text-xs text-red-400/70">Needs review</p>
				</div>
			</div>
		</div>

		<!-- Filters -->
		<div class="bg-cb-quaternary-950 space-y-3 rounded-lg p-4">
			<!-- Row 1: Search + Type + Verified -->
			<div class="flex flex-wrap items-center gap-3">
				<UInput
					v-model="search"
					placeholder="Search..."
					icon="i-lucide-search"
					class="w-full md:w-64"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>

				<USelectMenu
					v-model="typeFilter"
					:items="typeOptions"
					value-key="id"
					class="w-full md:w-40"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>

				<USelectMenu
					v-model="verifiedFilter"
					:items="verifiedOptions"
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
								? 'i-lucide-arrow-up-narrow-wide'
								: 'i-lucide-arrow-down-wide-narrow'
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
					icon="i-lucide-refresh-cw"
					color="neutral"
					variant="ghost"
					:loading="isLoading"
					@click="fetchReleases"
				/>
			</div>

			<!-- Row 2: Artist filter -->
			<div class="flex items-center gap-3">
				<ArtistSearchSelect
					v-model="selectedArtistsWithLabel"
					multiple
					placeholder="Filter by artists..."
					search-placeholder="Search artist..."
					loading-text="Searching artists..."
					idle-text="Type at least 2 characters to search artists."
					empty-text="No artists match your search."
					class="flex-1"
					:ui="{
						base: 'bg-cb-quinary-900',
					}"
				/>
				<UButton
					v-if="selectedArtists.length > 0"
					label="Clear"
					color="error"
					variant="ghost"
					size="sm"
					@click="clearArtistSelection"
				/>
			</div>
		</div>

		<!-- Releases List -->
		<div class="bg-cb-quaternary-950 overflow-hidden rounded-lg">
			<!-- Loading state -->
			<div v-if="isLoading && releasesList.length === 0" class="space-y-2 p-4">
				<SkeletonDefault v-for="i in 5" :key="i" class="h-20 w-full rounded-lg" />
			</div>

			<!-- Empty state -->
			<div v-else-if="!isLoading && releasesList.length === 0" class="py-16 text-center">
				<UIcon
					name="i-lucide-music"
					class="text-cb-tertiary-500 mx-auto size-16 opacity-50"
				/>
				<p class="text-cb-tertiary-500 mt-4">No release found</p>
			</div>

			<!-- Releases -->
			<div v-else class="divide-cb-quinary-900 divide-y">
				<div
					v-for="release in releasesList"
					:key="release.id"
					class="hover:bg-cb-quinary-900/30 group flex items-center gap-4 p-3 transition-colors"
					:class="isReleaseFlagged(release) ? 'bg-red-900/10' : ''"
				>
					<!-- Image -->
					<NuxtLink :to="`/release/${release.id}`" class="shrink-0">
						<NuxtImg
							v-if="release.image"
							:src="release.image"
							:alt="release.name"
							format="webp"
							class="size-16 rounded-lg object-cover"
						/>
						<div
							v-else
							class="bg-cb-quinary-900 flex size-16 items-center justify-center rounded-lg"
						>
							<UIcon name="i-lucide-music" class="text-cb-tertiary-500 size-8" />
						</div>
					</NuxtLink>

					<!-- Info -->
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<NuxtLink
								:to="`/release/${release.id}`"
								class="hover:text-cb-primary-900 truncate font-semibold transition-colors"
							>
								{{ release.name }}
							</NuxtLink>
							<UBadge :color="getTypeBadgeColor(release.type)" variant="subtle" size="xs">
								{{ release.type || 'N/A' }}
							</UBadge>
							<UBadge v-if="!release.verified" color="error" variant="subtle" size="xs">
								Unverified
							</UBadge>
							<UBadge
								v-if="hasYearMismatch(release)"
								color="warning"
								variant="subtle"
								size="xs"
							>
								Incorrect year
							</UBadge>
						</div>
						<p class="text-cb-tertiary-400 truncate text-sm">
							{{ formatArtists(release.artists) }}
						</p>
						<div class="text-cb-tertiary-500 mt-1 flex items-center gap-3 text-xs">
							<span>{{ formatDate(release.date) }}</span>
							<span v-if="release.year">({{ release.year }})</span>
							<span v-if="release.id_youtube_music" class="text-cb-tertiary-600 truncate">
								YTM: {{ release.id_youtube_music }}
							</span>
						</div>
					</div>

					<!-- Musics count -->
					<div
						v-if="release.musics?.length"
						class="text-cb-tertiary-500 hidden text-center md:block"
					>
						<p class="text-lg font-semibold">{{ release.musics.length }}</p>
						<p class="text-xs">tracks</p>
					</div>

					<!-- Actions -->
					<div
						class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
					>
						<UButton
							icon="i-lucide-pencil"
							color="neutral"
							variant="ghost"
							size="sm"
							@click="openEditModal(release)"
						/>
						<UButton
							icon="i-lucide-trash-2"
							color="error"
							variant="ghost"
							size="sm"
							@click="openDeleteModal(release.id)"
						/>
						<UButton
							:to="`/release/${release.id}`"
							icon="i-lucide-square-arrow-out-up-right"
							color="neutral"
							variant="ghost"
							size="sm"
							target="_blank"
						/>
					</div>
				</div>
			</div>

			<!-- Pagination -->
			<div
				v-if="totalPages > 1"
				class="border-cb-quinary-900 flex items-center justify-between border-t px-4 py-3"
			>
				<p class="text-cb-tertiary-500 text-sm">
					Page {{ currentPage }} of {{ totalPages }}
				</p>
				<UPagination
					v-model:page="currentPage"
					:total="totalReleases"
					:items-per-page="pageSizeValue"
				/>
			</div>
		</div>

		<!-- Edit Modal -->
		<UModal
			v-model:open="isEditModalOpen"
			title="Edit release"
			description="Update release metadata and verification state."
			:ui="{
				content:
					'bg-cb-secondary-950 w-full max-w-5xl rounded-[28px] border border-cb-quinary-900/70 shadow-2xl',
			}"
		>
			<template #content>
				<div
					v-if="editingRelease"
					class="bg-cb-secondary-950 flex max-h-[90vh] flex-col overflow-hidden"
				>
					<div
						class="border-cb-quinary-900/70 flex items-start justify-between gap-6 border-b px-6 py-5"
					>
						<div class="flex min-w-0 items-start gap-4">
							<div
								v-if="editingRelease.image"
								class="bg-cb-quinary-900 h-20 w-20 shrink-0 overflow-hidden rounded-2xl"
							>
								<NuxtImg
									:src="editingRelease.image || ''"
									:alt="editingRelease.name"
									format="webp"
									class="h-full w-full object-cover"
								/>
							</div>
							<div
								v-else
								class="bg-cb-quinary-900 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl"
							>
								<UIcon name="i-lucide-music" class="text-cb-tertiary-500 size-10" />
							</div>

							<div class="min-w-0 space-y-2">
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="truncate text-2xl font-bold">Edit release</h3>
									<UBadge
										v-if="editingRelease.type"
										color="primary"
										variant="subtle"
										size="xs"
									>
										{{ editingRelease.type }}
									</UBadge>
									<UBadge
										v-if="!editingRelease.verified"
										color="warning"
										variant="subtle"
										size="xs"
									>
										Pending
									</UBadge>
								</div>
								<p class="truncate text-sm font-medium">{{ editingRelease.name }}</p>
								<p class="text-cb-tertiary-500 text-sm">
									{{ formatArtists(editingRelease.artists) }}
								</p>
								<div
									class="text-cb-tertiary-500 flex flex-wrap items-center gap-3 text-xs"
								>
									<span>{{ editingRelease.musics.length }} linked track(s)</span>
									<span v-if="editingRelease.id_youtube_music">
										YouTube: {{ editingRelease.id_youtube_music }}
									</span>
								</div>
							</div>
						</div>

						<UButton
							icon="i-lucide-x"
							color="neutral"
							variant="ghost"
							aria-label="Close edit release modal"
							@click="closeEditModal"
						/>
					</div>

					<FormEditRelease
						:id="editingRelease.id"
						:name="editingRelease.name"
						:type="editingRelease.type || ''"
						:id-youtube-music="editingRelease.id_youtube_music || ''"
						:date="editingRelease.date || ''"
						:year-released="editingRelease.year || 0"
						:need-to-be-verified="!editingRelease.verified"
						@saved="handleReleaseSaved"
						@close="closeEditModal"
					/>
				</div>
			</template>
		</UModal>

		<!-- Delete Confirmation Modal -->
		<UModal v-model:open="isDeleteModalOpen">
			<template #content>
				<div class="bg-cb-secondary-950 space-y-5 p-6">
					<div class="text-center">
						<UIcon name="i-lucide-triangle-alert" class="mx-auto size-12 text-red-500" />
						<h3 class="mt-4 text-lg font-bold">Confirm deletion</h3>
						<p class="text-cb-tertiary-400 mt-2 text-sm">
							This action cannot be undone. The release and all associated links will be
							deleted.
						</p>
					</div>
					<div class="flex gap-3">
						<UButton
							label="Cancel"
							color="neutral"
							variant="outline"
							class="flex-1"
							@click="isDeleteModalOpen = false"
						/>
						<UButton label="Delete" color="error" class="flex-1" @click="confirmDelete" />
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>
