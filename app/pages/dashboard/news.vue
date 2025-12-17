<script setup lang="ts">
	import type { News, Artist } from '~/types'
	import type { TableColumn } from '@nuxt/ui'
	import { useSupabaseNews } from '~/composables/Supabase/useSupabaseNews'
	import { useSupabaseSearch } from '~/composables/useSupabaseSearch'
	import { CalendarDate } from '@internationalized/date'

	const toast = useToast()
	const { getAllNews, deleteNews: deleteNewsFunction, updateNews, updateNewsArtistsRelations } = useSupabaseNews()
	const { searchArtistsFullText } = useSupabaseSearch()

	// Data state
	const newsList = ref<News[]>([])
	const isLoading = ref(false)
	const totalNews = ref(0)

	// Filters state
	const search = ref('')
	const filterVerifiedValue = ref<'all' | 'verified' | 'pending'>('all')
	const filterPeriodValue = ref<'all' | 'today' | 'week' | 'month'>('all')

	// Sorting state
	const sortColumn = ref<'date' | 'created_at' | 'artist'>('date')
	const sortDirection = ref<'asc' | 'desc'>('desc')

	// Pagination state
	const currentPage = ref(1)
	const pageSizeValue = ref(20)
	const totalPages = computed(() => Math.ceil(totalNews.value / pageSizeValue.value))

	// Select menu items
	const verifiedOptions: { label: string; id: string }[] = [
		{ label: 'Tous les statuts', id: 'all' },
		{ label: 'Vérifiées', id: 'verified' },
		{ label: 'En attente', id: 'pending' },
	]
	const periodOptions: { label: string; id: string }[] = [
		{ label: 'Toutes les périodes', id: 'all' },
		{ label: "Aujourd'hui", id: 'today' },
		{ label: 'Cette semaine', id: 'week' },
		{ label: 'Ce mois', id: 'month' },
	]
	const pageSizeOptions: { label: string; id: number }[] = [
		{ label: '20 par page', id: 20 },
		{ label: '50 par page', id: 50 },
		{ label: '100 par page', id: 100 },
	]

	// Edit modal state
	const isEditModalOpen = ref(false)
	const editingNews = ref<News | null>(null)
	const isUpdating = ref(false)
	const editNewsDate = ref<Date | null>(null)
	const editNewsMessage = ref('')
	const artistListSelected = ref<{ id: string; name: string; picture: string | null }[]>([])
	const searchArtist = ref('')
	const artistListSearched = ref<Artist[]>([])

	// Delete confirmation state
	const isDeleteModalOpen = ref(false)
	const deletingNewsId = ref<string | null>(null)

	// Statistics
	const stats = computed(() => {
		const verified = newsList.value.filter((n) => n.verified).length
		const pending = newsList.value.filter((n) => !n.verified).length
		return {
			total: totalNews.value,
			verified,
			pending,
			loadedCount: newsList.value.length,
		}
	})

	// Table columns definition
	const columns: TableColumn<News>[] = [
		{
			accessorKey: 'artists',
			header: 'Artiste(s)',
		},
		{
			accessorKey: 'message',
			header: 'Message',
		},
		{
			accessorKey: 'date',
			header: 'Date',
		},
		{
			accessorKey: 'verified',
			header: 'Statut',
		},
		{
			accessorKey: 'user',
			header: 'Créé par',
		},
		{
			accessorKey: 'id',
			header: 'Actions',
		},
	]

	// Fetch news with filters
	const fetchNews = async () => {
		isLoading.value = true

		try {
			const result = await getAllNews({
				search: search.value,
				orderBy: sortColumn.value as keyof News,
				orderDirection: sortDirection.value,
				limit: pageSizeValue.value,
				offset: (currentPage.value - 1) * pageSizeValue.value,
			})

			// Apply client-side filters for verified status and period
			let filtered = result.news

			if (filterVerifiedValue.value !== 'all') {
				filtered = filtered.filter((n) =>
					filterVerifiedValue.value === 'verified' ? n.verified : !n.verified,
				)
			}

			if (filterPeriodValue.value !== 'all') {
				const now = new Date()
				const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

				filtered = filtered.filter((n) => {
					if (!n.date) return false
					const newsDate = new Date(n.date)

					switch (filterPeriodValue.value) {
						case 'today':
							return newsDate >= startOfDay
						case 'week': {
							const weekAgo = new Date(startOfDay)
							weekAgo.setDate(weekAgo.getDate() - 7)
							return newsDate >= weekAgo
						}
						case 'month': {
							const monthAgo = new Date(startOfDay)
							monthAgo.setMonth(monthAgo.getMonth() - 1)
							return newsDate >= monthAgo
						}
						default:
							return true
					}
				})
			}

			newsList.value = filtered
			totalNews.value = result.total
		} catch (error) {
			console.error('Erreur lors de la récupération des news:', error)
			toast.add({
				title: 'Erreur',
				description: 'Erreur lors du chargement des news',
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	// Format date for display
	const formatDate = (dateString: string | null) => {
		if (!dateString) return '-'
		return new Date(dateString).toLocaleDateString('fr-FR', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		})
	}

	// Format artists for display
	const formatArtists = (artists: Artist[] | null | undefined) => {
		if (!artists || artists.length === 0) return '-'
		return artists.map((a) => a.name).join(', ')
	}

	// Sort handler
	const handleSort = (column: 'date' | 'created_at' | 'artist') => {
		if (sortColumn.value === column) {
			sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
		} else {
			sortColumn.value = column
			sortDirection.value = 'desc'
		}
		currentPage.value = 1
		fetchNews()
	}


	// Edit modal functions
	const openEditModal = (news: News) => {
		editingNews.value = news
		editNewsDate.value = news.date ? new Date(news.date) : null
		editNewsMessage.value = news.message || ''
		artistListSelected.value =
			news.artists?.map((a) => ({
				id: a.id,
				name: a.name,
				picture: a.image,
			})) || []
		isEditModalOpen.value = true
	}

	const closeEditModal = () => {
		isEditModalOpen.value = false
		editingNews.value = null
		searchArtist.value = ''
		artistListSearched.value = []
	}

	const parseToCalendarDate = (date: Date | null | undefined): CalendarDate | null => {
		if (!date) return null
		try {
			const year = date.getUTCFullYear()
			const month = date.getUTCMonth() + 1
			const day = date.getUTCDate()
			return new CalendarDate(year, month, day)
		} catch {
			return null
		}
	}

	// Debounced artist search
	const debouncedSearch = useDebounce(async (query: string) => {
		try {
			const result = await searchArtistsFullText({ query, limit: 10 })
			artistListSearched.value = result.artists
		} catch (error) {
			console.error('Error during search:', error)
		}
	}, 500)

	const addArtistToNews = (artist: Artist) => {
		if (!artistListSelected.value.some((a) => a.id === artist.id)) {
			artistListSelected.value.push({
				id: artist.id,
				name: artist.name,
				picture: artist.image,
			})
		}
		searchArtist.value = ''
		artistListSearched.value = []
	}

	const removeArtistFromNews = (artistId: string) => {
		artistListSelected.value = artistListSelected.value.filter((a) => a.id !== artistId)
	}

	const updateNewsData = async () => {
		if (!editingNews.value) return
		isUpdating.value = true

		try {
			await updateNews(editingNews.value.id, {
				date: editNewsDate.value?.toISOString() ?? editingNews.value.date,
				message: editNewsMessage.value,
			})

			const artistIds = artistListSelected.value.map((a) => a.id)
			await updateNewsArtistsRelations(editingNews.value.id, artistIds)

			toast.add({
				title: 'Succès',
				description: 'News mise à jour',
				color: 'success',
			})

			closeEditModal()
			fetchNews()
		} catch (error) {
			console.error('Error updating news:', error)
			toast.add({
				title: 'Erreur',
				description: 'Erreur lors de la mise à jour',
				color: 'error',
			})
		} finally {
			isUpdating.value = false
		}
	}

	// Delete functions
	const openDeleteModal = (newsId: string) => {
		deletingNewsId.value = newsId
		isDeleteModalOpen.value = true
	}

	const confirmDelete = async () => {
		if (!deletingNewsId.value) return

		try {
			const success = await deleteNewsFunction(deletingNewsId.value)
			if (success) {
				toast.add({
					title: 'Succès',
					description: 'News supprimée',
					color: 'success',
				})
				fetchNews()
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
			deletingNewsId.value = null
		}
	}

	// Watchers
	watch(searchArtist, (value) => {
		if (value.length > 2) {
			debouncedSearch(value)
		} else {
			artistListSearched.value = []
		}
	})

	// Track if filter change triggered the page reset to avoid double fetch
	const isFilterChange = ref(false)

	watch([search, filterVerifiedValue, filterPeriodValue, pageSizeValue], () => {
		isFilterChange.value = true
		currentPage.value = 1
		fetchNews()
	})

	// Watch page changes from pagination (only if not from filter change)
	watch(currentPage, () => {
		if (isFilterChange.value) {
			isFilterChange.value = false
			return
		}
		fetchNews()
	})

	// Initial load
	onMounted(() => {
		fetchNews()
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
			<div>
				<h1 class="text-2xl font-bold">Gestion des News</h1>
				<p class="text-cb-tertiary-500 text-sm">
					{{ stats.loadedCount }} / {{ stats.total }} news chargées
				</p>
			</div>

			<!-- Stats cards -->
			<div class="flex gap-3">
				<div class="bg-cb-quaternary-950 rounded-lg px-4 py-2 text-center">
					<p class="text-2xl font-bold">{{ stats.total }}</p>
					<p class="text-cb-tertiary-500 text-xs">Total</p>
				</div>
				<div class="rounded-lg bg-green-900/30 px-4 py-2 text-center">
					<p class="text-2xl font-bold text-green-400">{{ stats.verified }}</p>
					<p class="text-xs text-green-400/70">Vérifiées</p>
				</div>
				<div class="rounded-lg bg-yellow-900/30 px-4 py-2 text-center">
					<p class="text-2xl font-bold text-yellow-400">{{ stats.pending }}</p>
					<p class="text-xs text-yellow-400/70">En attente</p>
				</div>
			</div>
		</div>

		<!-- Filters -->
		<div class="bg-cb-quaternary-950 flex flex-wrap items-center gap-3 rounded-lg p-4">
			<!-- Search -->
			<UInput
				v-model="search"
				placeholder="Rechercher..."
				icon="i-heroicons-magnifying-glass"
				class="w-full md:w-64"
				:ui="{ base: 'bg-cb-quinary-900' }"
			/>

			<!-- Filter by status -->
			<USelectMenu
				v-model="filterVerifiedValue"
				:items="verifiedOptions"
				value-key="id"
				class="w-full md:w-40"
				:ui="{ base: 'bg-cb-quinary-900' }"
			/>

			<!-- Filter by period -->
			<USelectMenu
				v-model="filterPeriodValue"
				:items="periodOptions"
				value-key="id"
				class="w-full md:w-44"
				:ui="{ base: 'bg-cb-quinary-900' }"
			/>

			<!-- Items per page -->
			<USelectMenu
				v-model="pageSizeValue"
				:items="pageSizeOptions"
				value-key="id"
				class="w-full md:w-36"
				:ui="{ base: 'bg-cb-quinary-900' }"
			/>

			<!-- Refresh button -->
			<UButton
				icon="i-heroicons-arrow-path"
				color="neutral"
				variant="ghost"
				:loading="isLoading"
				@click="fetchNews"
			/>
		</div>

		<!-- Table -->
		<div class="bg-cb-quaternary-950 overflow-hidden rounded-lg">
			<UTable
				:data="newsList"
				:columns="columns"
				:loading="isLoading"
				:ui="{
					base: 'w-full',
					thead: 'bg-cb-quinary-900',
					tbody: 'divide-y divide-cb-quinary-900',
					tr: 'hover:bg-cb-quinary-900/50 transition-colors',
					th: 'text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-cb-tertiary-400',
					td: 'px-4 py-3 text-sm',
				}"
			>
				<!-- Artists column -->
				<template #artists-header>
					<button
						class="flex items-center gap-1 hover:text-white"
						@click="handleSort('artist')"
					>
						Artiste(s)
						<UIcon
							v-if="sortColumn === 'artist'"
							:name="sortDirection === 'asc' ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
							class="size-4"
						/>
					</button>
				</template>
				<template #artists-cell="{ row }">
					<div class="flex items-center gap-2">
						<div v-if="row.original.artists?.length" class="flex -space-x-2">
							<NuxtImg
								v-for="artist in row.original.artists.slice(0, 3)"
								:key="artist.id"
								:src="artist.image ?? ''"
								:alt="artist.name"
								class="border-cb-quaternary-950 size-8 rounded-full border-2 object-cover"
								format="webp"
							/>
						</div>
						<span class="max-w-[200px] truncate">
							{{ formatArtists(row.original.artists) }}
						</span>
					</div>
				</template>

				<!-- Message column -->
				<template #message-cell="{ row }">
					<span class="line-clamp-2 max-w-[300px]">
						{{ row.original.message || '-' }}
					</span>
				</template>

				<!-- Date column -->
				<template #date-header>
					<button
						class="flex items-center gap-1 hover:text-white"
						@click="handleSort('date')"
					>
						Date
						<UIcon
							v-if="sortColumn === 'date'"
							:name="sortDirection === 'asc' ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
							class="size-4"
						/>
					</button>
				</template>
				<template #date-cell="{ row }">
					{{ formatDate(row.original.date) }}
				</template>

				<!-- Verified column -->
				<template #verified-cell="{ row }">
					<UBadge
						:color="row.original.verified ? 'success' : 'warning'"
						variant="subtle"
						size="sm"
					>
						{{ row.original.verified ? 'Vérifiée' : 'En attente' }}
					</UBadge>
				</template>

				<!-- User column -->
				<template #user-cell="{ row }">
					<div class="flex items-center gap-2">
						<NuxtImg
							v-if="row.original.user?.photo_url"
							:src="row.original.user.photo_url"
							:alt="row.original.user.name"
							class="size-6 rounded-full object-cover"
							format="webp"
						/>
						<span class="text-cb-tertiary-400 text-xs">
							{{ row.original.user?.name || 'Inconnu' }}
						</span>
					</div>
				</template>

				<!-- Actions column -->
				<template #id-header>
					<span class="sr-only">Actions</span>
				</template>
				<template #id-cell="{ row }">
					<div class="flex items-center gap-1">
						<UButton
							icon="i-heroicons-pencil-square"
							color="neutral"
							variant="ghost"
							size="sm"
							@click="openEditModal(row.original)"
						/>
						<UButton
							icon="i-heroicons-trash"
							color="error"
							variant="ghost"
							size="sm"
							@click="openDeleteModal(row.original.id)"
						/>
					</div>
				</template>

				<!-- Empty state -->
				<template #empty>
					<div class="text-cb-tertiary-500 py-10 text-center">
						<UIcon name="i-heroicons-document-magnifying-glass" class="mx-auto size-12 opacity-50" />
						<p class="mt-2">Aucune news trouvée</p>
					</div>
				</template>
			</UTable>

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
					:total="totalNews"
					:items-per-page="pageSizeValue"
				/>
			</div>
		</div>

		<!-- Edit Modal -->
		<UModal v-model:open="isEditModalOpen">
			<template #content>
				<div class="bg-cb-secondary-950 space-y-5 p-6">
					<div class="flex items-center justify-between">
						<h3 class="text-xl font-bold">Modifier la news</h3>
						<UButton
							icon="i-heroicons-x-mark"
							color="neutral"
							variant="ghost"
							@click="closeEditModal"
						/>
					</div>

					<!-- Artist search -->
					<div class="relative">
						<UInput
							v-model="searchArtist"
							label="Rechercher un artiste"
							placeholder="Tapez pour rechercher..."
							icon="i-heroicons-magnifying-glass"
						/>
						<div
							v-if="artistListSearched.length"
							class="bg-cb-quaternary-950 absolute top-full z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg shadow-lg"
						>
							<button
								v-for="artist in artistListSearched"
								:key="artist.id"
								class="hover:bg-cb-quinary-900 flex w-full items-center gap-2 px-3 py-2 text-left"
								@click="addArtistToNews(artist)"
							>
								<NuxtImg
									v-if="artist.image"
									:src="artist.image"
									class="size-6 rounded-full object-cover"
								/>
								{{ artist.name }}
							</button>
						</div>
					</div>

					<!-- Selected artists -->
					<div v-if="artistListSelected.length" class="space-y-2">
						<p class="text-cb-tertiary-400 text-sm">Artistes sélectionnés</p>
						<div class="flex flex-wrap gap-2">
							<UBadge
								v-for="artist in artistListSelected"
								:key="artist.id"
								color="primary"
								variant="subtle"
								class="cursor-pointer"
								@click="removeArtistFromNews(artist.id)"
							>
								{{ artist.name }}
								<UIcon name="i-heroicons-x-mark" class="ml-1 size-3" />
							</UBadge>
						</div>
					</div>

					<!-- Date picker -->
					<div class="space-y-2">
						<p class="text-cb-tertiary-400 text-sm">Date</p>
						<UCalendar
							class="bg-cb-quinary-900 rounded-lg p-2"
							:model-value="parseToCalendarDate(editNewsDate)"
							@update:model-value="
								(value) => {
									editNewsDate = value ? new Date(value.toString()) : null
								}
							"
						/>
					</div>

					<!-- Message -->
					<UTextarea
						v-model="editNewsMessage"
						label="Message"
						placeholder="Message de la news..."
						:rows="3"
					/>

					<!-- Actions -->
					<div class="flex gap-3">
						<UButton
							label="Annuler"
							color="neutral"
							variant="outline"
							class="flex-1"
							@click="closeEditModal"
						/>
						<UButton
							label="Enregistrer"
							color="primary"
							class="flex-1"
							:loading="isUpdating"
							@click="updateNewsData"
						/>
					</div>
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
							Cette action est irréversible. La news sera définitivement supprimée.
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
