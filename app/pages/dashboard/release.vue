<script setup lang="ts">
	import type {
		Release,
		Artist,
		ReleaseType,
		ReleaseWithRelations,
		ArtistMenuItem,
	} from '~/types'
	import { useSupabaseRelease } from '~/composables/Supabase/useSupabaseRelease'
	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
	import { useUserStore } from '~/stores/user'

	const { deleteRelease: deleteReleaseFunction, getReleasesByPage } = useSupabaseRelease()
	const { getAllArtists } = useSupabaseArtist()
	const toast = useToast()
	const userStore = useUserStore()

	// Data state
	const releasesList = ref<ReleaseWithRelations[]>([])
	const isLoading = ref(false)
	const totalReleases = ref(0)
	const artistsList = ref<Artist[]>([])

	// Filters state
	const search = ref('')
	const typeFilter = ref<string>('ALL')
	const verifiedFilter = ref<'all' | 'verified' | 'pending'>('all')
	const selectedArtists = ref<string[]>([])
	const selectedArtistsWithLabel = ref<ArtistMenuItem[]>([])

	// Sorting state
	const sortColumn = ref<string>('date')
	const sortDirection = ref<'asc' | 'desc'>('desc')

	// Pagination state
	const currentPage = ref(1)
	const pageSizeValue = ref(20)
	const totalPages = computed(() => Math.ceil(totalReleases.value / pageSizeValue.value))

	// Edit modal state
	const isEditModalOpen = ref(false)
	const editingRelease = ref<ReleaseWithRelations | null>(null)

	// Delete modal state
	const isDeleteModalOpen = ref(false)
	const deletingReleaseId = ref<string | null>(null)

	// Select menu options
	const typeOptions: { label: string; id: string }[] = [
		{ label: 'Tous les types', id: 'ALL' },
		{ label: 'Single', id: 'SINGLE' },
		{ label: 'Album', id: 'ALBUM' },
		{ label: 'EP', id: 'EP' },
	]

	const verifiedOptions: { label: string; id: string }[] = [
		{ label: 'Tous les statuts', id: 'all' },
		{ label: 'Vérifiées', id: 'verified' },
		{ label: 'En attente', id: 'pending' },
	]

	const sortOptions: { label: string; id: string }[] = [
		{ label: 'Date de sortie', id: 'date' },
		{ label: 'Nom', id: 'name' },
		{ label: 'Type', id: 'type' },
		{ label: 'Année', id: 'year' },
		{ label: 'Date création', id: 'created_at' },
	]

	const pageSizeOptions: { label: string; id: number }[] = [
		{ label: '20 par page', id: 20 },
		{ label: '50 par page', id: 50 },
		{ label: '100 par page', id: 100 },
	]

	// Artists menu for filter
	const artistsForMenu = computed((): ArtistMenuItem[] => {
		return artistsList.value.map((artist) => ({
			id: artist.id,
			label: artist.name,
			name: artist.name,
			description: artist.description ?? undefined,
			image: artist.image,
		}))
	})

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

	// Fetch releases
	const fetchReleases = async () => {
		isLoading.value = true

		const filters = {
			search: search.value || undefined,
			type: typeFilter.value === 'ALL' ? undefined : typeFilter.value,
			orderBy: sortColumn.value,
			orderDirection: sortDirection.value,
			artistIds: selectedArtists.value.length > 0 ? selectedArtists.value : undefined,
			verified: verifiedFilter.value === 'all' ? undefined : verifiedFilter.value === 'verified',
		}

		console.log('🔍 fetchReleases appelé avec:', {
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
			const result = await getReleasesByPage(currentPage.value, pageSizeValue.value, filters)

			releasesList.value = result.releases
			totalReleases.value = result.total
		} catch (error) {
			console.error('Erreur lors de la récupération des releases:', error)
			toast.add({
				title: 'Erreur',
				description: 'Erreur lors du chargement des releases',
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	// Format date
	const formatDate = (dateString: string | null) => {
		if (!dateString) return '-'
		return new Date(dateString).toLocaleDateString('fr-FR', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		})
	}

	// Format artists
	const formatArtists = (artists: Artist[] | undefined) => {
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
	const hasYearMismatch = (release: ReleaseWithRelations) => {
		if (!release.date || !release.year) return false
		const dateYear = new Date(release.date).getFullYear()
		return dateYear !== release.year
	}

	// Toggle sort direction
	const toggleSortDirection = () => {
		sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
	}

	// Edit modal
	const openEditModal = (release: ReleaseWithRelations) => {
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
					title: 'Succès',
					description: 'Release supprimée',
					color: 'success',
				})
				fetchReleases()
			} else {
				toast.add({
					title: 'Erreur',
					description: 'Erreur lors de la suppression',
					color: 'error',
				})
			}
		} catch (error) {
			console.error('Erreur lors de la suppression:', error)
			toast.add({
				title: 'Erreur',
				description: 'Erreur lors de la suppression',
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

	watch([typeFilter, verifiedFilter, selectedArtists, sortColumn, sortDirection, pageSizeValue], async () => {
		isFilterChange.value = true
		currentPage.value = 1
		await nextTick()
		fetchReleases()
	})

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
		try {
			artistsList.value = await getAllArtists()
		} catch (error) {
			console.error('Erreur lors du chargement des artistes:', error)
		}
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
					<h1 class="text-2xl font-bold">Gestion des Releases</h1>
					<p class="text-cb-tertiary-500 text-sm">
						{{ stats.loaded }} / {{ stats.total }} releases chargées
					</p>
				</div>
				<UButton
					v-if="userStore?.isAdminStore"
					to="/release/create"
					icon="i-heroicons-plus"
					size="sm"
					class="bg-cb-primary-800 text-white"
				>
					Nouvelle release
				</UButton>
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
				<div v-if="stats.pending > 0" class="rounded-lg bg-red-900/30 px-3 py-1.5 text-center">
					<p class="text-lg font-bold text-red-400">{{ stats.pending }}</p>
					<p class="text-xs text-red-400/70">À vérifier</p>
				</div>
			</div>
		</div>

		<!-- Filters -->
		<div class="bg-cb-quaternary-950 space-y-3 rounded-lg p-4">
			<!-- Row 1: Search + Type + Verified -->
			<div class="flex flex-wrap items-center gap-3">
				<UInput
					v-model="search"
					placeholder="Rechercher..."
					icon="i-heroicons-magnifying-glass"
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
						:icon="sortDirection === 'asc' ? 'i-heroicons-bars-arrow-up' : 'i-heroicons-bars-arrow-down'"
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
					@click="fetchReleases"
				/>
			</div>

			<!-- Row 2: Artist filter -->
			<div class="flex items-center gap-3">
				<UInputMenu
					v-model="selectedArtistsWithLabel"
					:items="artistsForMenu"
					by="id"
					multiple
					placeholder="Filtrer par artistes..."
					searchable
					searchable-placeholder="Rechercher un artiste..."
					class="bg-cb-quinary-900 flex-1"
					:ui="{
						content: 'bg-cb-quaternary-950',
						item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
					}"
				/>
				<UButton
					v-if="selectedArtists.length > 0"
					label="Effacer"
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
				<UIcon name="i-heroicons-musical-note" class="text-cb-tertiary-500 mx-auto size-16 opacity-50" />
				<p class="text-cb-tertiary-500 mt-4">Aucune release trouvée</p>
			</div>

			<!-- Releases -->
			<div v-else class="divide-cb-quinary-900 divide-y">
				<div
					v-for="release in releasesList"
					:key="release.id"
					class="hover:bg-cb-quinary-900/30 group flex items-center gap-4 p-3 transition-colors"
					:class="{ 'bg-red-900/10': !release.verified || hasYearMismatch(release) }"
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
						<div v-else class="bg-cb-quinary-900 flex size-16 items-center justify-center rounded-lg">
							<UIcon name="i-heroicons-musical-note" class="text-cb-tertiary-500 size-8" />
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
								Non vérifié
							</UBadge>
							<UBadge v-if="hasYearMismatch(release)" color="warning" variant="subtle" size="xs">
								Année incorrecte
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
					<div v-if="release.musics?.length" class="text-cb-tertiary-500 hidden text-center md:block">
						<p class="text-lg font-semibold">{{ release.musics.length }}</p>
						<p class="text-xs">pistes</p>
					</div>

					<!-- Actions -->
					<div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
						<UButton
							icon="i-heroicons-pencil-square"
							color="neutral"
							variant="ghost"
							size="sm"
							@click="openEditModal(release)"
						/>
						<UButton
							icon="i-heroicons-trash"
							color="error"
							variant="ghost"
							size="sm"
							@click="openDeleteModal(release.id)"
						/>
						<UButton
							:to="`/release/${release.id}`"
							icon="i-heroicons-arrow-top-right-on-square"
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
					Page {{ currentPage }} sur {{ totalPages }}
				</p>
				<UPagination
					v-model:page="currentPage"
					:total="totalReleases"
					:items-per-page="pageSizeValue"
				/>
			</div>
		</div>

		<!-- Edit Modal -->
		<UModal v-model:open="isEditModalOpen">
			<template #content>
				<div class="bg-cb-secondary-950 p-6">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-xl font-bold">Modifier la release</h3>
						<UButton
							icon="i-heroicons-x-mark"
							color="neutral"
							variant="ghost"
							@click="closeEditModal"
						/>
					</div>
					<FormEditRelease
						v-if="editingRelease"
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
						<UIcon name="i-heroicons-exclamation-triangle" class="mx-auto size-12 text-red-500" />
						<h3 class="mt-4 text-lg font-bold">Confirmer la suppression</h3>
						<p class="text-cb-tertiary-400 mt-2 text-sm">
							Cette action est irréversible. La release et toutes ses associations seront supprimées.
						</p>
					</div>
					<div class="flex gap-3">
						<UButton
							label="Annuler"
							color="neutral"
							variant="outline"
							class="flex-1"
							@click="isDeleteModalOpen = false"
						/>
						<UButton
							label="Supprimer"
							color="error"
							class="flex-1"
							@click="confirmDelete"
						/>
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>
