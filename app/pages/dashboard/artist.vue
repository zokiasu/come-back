<script setup lang="ts">
	import type { Artist, ArtistType, Nationality } from '~/types'
	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
	import { useSupabaseNationalities } from '~/composables/Supabase/useSupabaseNationalities'

	const toast = useToast()
	const { getArtistsByPage } = useSupabaseArtist()
	const { getAllNationalities } = useSupabaseNationalities()

	// Data state
	const artistsList = ref<Artist[]>([])
	const isLoading = ref(false)
	const totalArtists = ref(0)

	// Filters state
	const search = ref('')
	const typeFilter = ref<ArtistType | 'ALL'>('ALL')
	const genderFilter = ref<string>('ALL')
	const styleFilter = ref<string>('ALL')
	const nationalityFilter = ref<string>('ALL')
	const careerFilter = ref<string>('ALL')
	const missingFilter = ref<string>('NONE')

	const nationalitiesList = ref<Nationality[]>([])

	// Sorting state
	const sortColumn = ref<keyof Artist>('name')
	const sortDirection = ref<'asc' | 'desc'>('asc')

	// Pagination state
	const currentPage = ref(1)
	const pageSizeValue = ref(20)
	const totalPages = computed(() => Math.ceil(totalArtists.value / pageSizeValue.value))

	// Delete modal state
	const isDeleteModalOpen = ref(false)
	const deletingArtist = ref<Artist | null>(null)

	// Ban modal state
	const isBanModalOpen = ref(false)
	const banningArtist = ref<Artist | null>(null)

	// Select menu options
	const typeOptions: { label: string; id: string }[] = [
		{ label: 'All types', id: 'ALL' },
		{ label: 'Solo', id: 'SOLO' },
		{ label: 'Group', id: 'GROUP' },
	]

	const genderOptions: { label: string; id: string }[] = [
		{ label: 'All genders', id: 'ALL' },
		{ label: 'Male', id: 'MALE' },
		{ label: 'Female', id: 'FEMALE' },
		{ label: 'Mixed', id: 'MIXTE' },
		{ label: 'Unknown', id: 'UNKNOWN' },
	]

	const styleOptions: { label: string; id: string }[] = [
		{ label: 'All styles', id: 'ALL' },
		{ label: 'K-Pop', id: 'K-Pop' },
		{ label: 'K-Hiphop', id: 'K-Hiphop' },
		{ label: 'K-Rap', id: 'K-Rap' },
		{ label: 'K-R&B', id: 'K-R&B' },
		{ label: 'K-Rock', id: 'K-Rock' },
		{ label: 'K-Ballad', id: 'K-Ballad' },
		{ label: 'J-Pop', id: 'J-Pop' },
		{ label: 'J-Hiphop', id: 'J-Hiphop' },
		{ label: 'J-Rock', id: 'J-Rock' },
		{ label: 'C-Pop', id: 'C-Pop' },
		{ label: 'Mando-Pop', id: 'Mando-Pop' },
		{ label: 'Thai-Pop', id: 'Thai-Pop' },
		{ label: 'Pop', id: 'Pop' },
	]

	const nationalityOptions = computed(() => [
		{ label: 'All nationalities', id: 'ALL' },
		...nationalitiesList.value.map((nationality) => ({
			label: nationality.name,
			id: nationality.name,
		})),
	])

	const careerOptions: { label: string; id: string }[] = [
		{ label: 'All', id: 'ALL' },
		{ label: 'Active', id: 'ACTIVE' },
		{ label: 'Inactive', id: 'INACTIVE' },
	]

	const missingOptions: { label: string; id: string }[] = [
		{ label: 'All', id: 'NONE' },
		{ label: 'No description', id: 'NO_DESC' },
		{ label: 'No socials', id: 'NO_SOCIALS' },
		{ label: 'No platforms', id: 'NO_PLATFORMS' },
		{ label: 'No styles', id: 'NO_STYLES' },
	]

	const sortOptions: { label: string; id: string }[] = [
		{ label: 'Name', id: 'name' },
		{ label: 'Type', id: 'type' },
		{ label: 'Created date', id: 'created_at' },
		{ label: 'Updated date', id: 'updated_at' },
	]

	const pageSizeOptions: { label: string; id: number }[] = [
		{ label: '20 per page', id: 20 },
		{ label: '50 per page', id: 50 },
		{ label: '100 per page', id: 100 },
	]

	// Statistics
	const stats = computed(() => {
		let solos = 0
		let groups = 0
		let active = 0
		let inactive = 0
		let noDesc = 0
		let noSocials = 0
		let noPlatforms = 0
		let noStyles = 0

		for (const a of artistsList.value) {
			if (a.type === 'SOLO') solos++
			if (a.type === 'GROUP') groups++
			if (a.active_career) active++
			else inactive++
			if (!a.description) noDesc++
			if (!a.social_links || a.social_links.length === 0) noSocials++
			if (!a.platform_links || a.platform_links.length === 0) noPlatforms++
			if (!a.styles || a.styles.length === 0) noStyles++
		}

		return {
			total: totalArtists.value,
			loaded: artistsList.value.length,
			solos,
			groups,
			active,
			inactive,
			incomplete: noDesc + noSocials + noPlatforms + noStyles,
			noDesc,
			noSocials,
			noPlatforms,
			noStyles,
		}
	})

	// Fetch artists
	const fetchArtists = async () => {
		isLoading.value = true

		try {
			const result = await getArtistsByPage(currentPage.value, pageSizeValue.value, {
				search: search.value || undefined,
				verified: true,
				type: typeFilter.value === 'ALL' ? undefined : typeFilter.value,
				gender: genderFilter.value === 'ALL' ? undefined : genderFilter.value,
				styles: styleFilter.value === 'ALL' ? undefined : [styleFilter.value],
				nationalities:
					nationalityFilter.value === 'ALL' ? undefined : [nationalityFilter.value],
				isActive:
					careerFilter.value === 'ALL' ? undefined : careerFilter.value === 'ACTIVE',
				onlyWithoutDesc: missingFilter.value === 'NO_DESC',
				onlyWithoutSocials: missingFilter.value === 'NO_SOCIALS',
				onlyWithoutPlatforms: missingFilter.value === 'NO_PLATFORMS',
				onlyWithoutStyles: missingFilter.value === 'NO_STYLES',
				orderBy: sortColumn.value,
				orderDirection: sortDirection.value,
			})

			artistsList.value = result.artists
			totalArtists.value = result.total
		} catch (error) {
			console.error('Error while fetching artists:', error)
			toast.add({
				title: 'Error',
				description: 'Error while loading artists',
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	// Format date
	const formatDate = (dateString: string | null) => {
		if (!dateString) return '-'
		return new Date(dateString).toLocaleDateString('sv-SE', {
			day: '2-digit',
			month: '2-digit',
			year: '2-digit',
		})
	}

	// Get type badge color
	const getTypeBadgeColor = (type: string | null) => {
		return type === 'SOLO' ? 'primary' : 'info'
	}

	// Get gender badge color
	const getGenderBadgeColor = (gender: string | null) => {
		switch (gender) {
			case 'MALE':
				return 'info'
			case 'FEMALE':
				return 'error'
			case 'MIXTE':
				return 'warning'
			default:
				return 'neutral'
		}
	}

	// Check missing data
	const getMissingData = (artist: Artist) => {
		const missing = []
		if (!artist.description) missing.push('desc')
		if (!artist.social_links || artist.social_links.length === 0) missing.push('socials')
		if (!artist.platform_links || artist.platform_links.length === 0)
			missing.push('platforms')
		if (!artist.styles || artist.styles.length === 0) missing.push('styles')
		return missing
	}

	const getMissingLabels = (artist: Artist) => {
		const missing = getMissingData(artist)
		const labelMap: Record<string, string> = {
			desc: 'description',
			socials: 'socials',
			platforms: 'platforms',
			styles: 'styles',
		}
		return missing.map((key) => labelMap[key]).filter(Boolean)
	}

	// Toggle sort direction
	const toggleSortDirection = () => {
		sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
	}

	// Delete modal
	const openDeleteModal = (artist: Artist) => {
		deletingArtist.value = artist
		isDeleteModalOpen.value = true
	}

	const confirmDelete = () => {
		// La suppression est gérée par le composant ModalConfirmDeleteArtist
		// On ferme juste le modal et on refresh
		isDeleteModalOpen.value = false
		deletingArtist.value = null
		fetchArtists()
	}

	// Ban modal
	const openBanModal = (artist: Artist) => {
		banningArtist.value = artist
		isBanModalOpen.value = true
	}

	const confirmBan = () => {
		isBanModalOpen.value = false
		banningArtist.value = null
		fetchArtists()
	}

	// Track if filter change triggered the page reset
	const isFilterChange = ref(false)

	// Debounced search
	const debouncedFetch = useDebounce(() => {
		isFilterChange.value = true
		currentPage.value = 1
		fetchArtists()
	}, 300)

	watch(search, () => {
		debouncedFetch()
	})

	watch(
		[
			typeFilter,
			genderFilter,
			styleFilter,
			nationalityFilter,
			careerFilter,
			missingFilter,
			sortColumn,
			sortDirection,
			pageSizeValue,
		],
		() => {
			isFilterChange.value = true
			currentPage.value = 1
			fetchArtists()
		},
	)

	// Watch page changes from pagination
	watch(currentPage, () => {
		if (isFilterChange.value) {
			isFilterChange.value = false
			return
		}
		fetchArtists()
	})

	const isTypingTarget = (target: EventTarget | null) => {
		if (!(target instanceof HTMLElement)) return false
		const tagName = target.tagName.toLowerCase()
		return (
			tagName === 'input' ||
			tagName === 'textarea' ||
			tagName === 'select' ||
			target.isContentEditable
		)
	}

	const onPageNavigationKeydown = (event: KeyboardEvent) => {
		if (isTypingTarget(event.target)) return
		if (event.key === 'ArrowLeft' && currentPage.value > 1) {
			event.preventDefault()
			currentPage.value -= 1
			return
		}
		if (event.key === 'ArrowRight' && currentPage.value < totalPages.value) {
			event.preventDefault()
			currentPage.value += 1
		}
	}

	// Initial load
	onMounted(async () => {
		nationalitiesList.value = await getAllNationalities()
		fetchArtists()
		if (import.meta.client) {
			window.addEventListener('keydown', onPageNavigationKeydown)
		}
	})

	onBeforeUnmount(() => {
		if (import.meta.client) {
			window.removeEventListener('keydown', onPageNavigationKeydown)
		}
	})

	definePageMeta({
		middleware: ['admin'],
		layout: 'dashboard',
		ssr: false,
	})
</script>

<template>
	<div class="scrollBarLight h-full space-y-4 overflow-y-auto p-6">
		<!-- Header with stats -->
		<div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
			<div>
				<h1 class="text-2xl font-bold">Artist Management</h1>
				<p class="text-cb-tertiary-500 text-sm">
					{{ stats.loaded }} / {{ stats.total }} artists loaded
				</p>
			</div>

			<!-- Stats cards -->
			<div class="flex flex-wrap gap-2">
				<div class="bg-cb-quaternary-950 rounded-lg px-3 py-1.5 text-center">
					<p class="text-lg font-bold">{{ stats.total }}</p>
					<p class="text-cb-tertiary-500 text-xs">Total</p>
				</div>
				<div class="rounded-lg bg-blue-900/30 px-3 py-1.5 text-center">
					<p class="text-lg font-bold text-blue-400">{{ stats.solos }}</p>
					<p class="text-xs text-blue-400/70">Solos</p>
				</div>
				<div class="rounded-lg bg-purple-900/30 px-3 py-1.5 text-center">
					<p class="text-lg font-bold text-purple-400">{{ stats.groups }}</p>
					<p class="text-xs text-purple-400/70">Groups</p>
				</div>
				<div class="rounded-lg bg-green-900/30 px-3 py-1.5 text-center">
					<p class="text-lg font-bold text-green-400">{{ stats.active }}</p>
					<p class="text-xs text-green-400/70">Active</p>
				</div>
				<div class="rounded-lg bg-gray-900/30 px-3 py-1.5 text-center">
					<p class="text-lg font-bold text-gray-400">{{ stats.inactive }}</p>
					<p class="text-xs text-gray-400/70">Inactive</p>
				</div>
				<div
					v-if="stats.incomplete > 0"
					class="rounded-lg bg-amber-900/30 px-3 py-1.5 text-center"
				>
					<p class="text-lg font-bold text-amber-400">{{ stats.incomplete }}</p>
					<p class="text-xs text-amber-400/70">Incomplete</p>
				</div>
			</div>
		</div>

		<!-- Filters -->
		<div class="bg-cb-quaternary-950 space-y-3 rounded-lg p-4">
			<!-- Row 1: Search + Type + Gender + Style + Career -->
			<div class="flex flex-wrap items-center gap-3">
				<UInput
					v-model="search"
					placeholder="Search..."
					icon="i-heroicons-magnifying-glass"
					class="w-full md:w-64"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>

				<USelectMenu
					v-model="typeFilter"
					:items="typeOptions"
					value-key="id"
					class="w-full md:w-36"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>

				<USelectMenu
					v-model="genderFilter"
					:items="genderOptions"
					value-key="id"
					class="w-full md:w-40"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>

				<USelectMenu
					v-model="styleFilter"
					:items="styleOptions"
					value-key="id"
					class="w-full md:w-36"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>

				<USelectMenu
					v-model="nationalityFilter"
					:items="nationalityOptions"
					value-key="id"
					class="w-full md:w-44"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>

				<USelectMenu
					v-model="careerFilter"
					:items="careerOptions"
					value-key="id"
					class="w-full md:w-32"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>
			</div>

			<!-- Row 2: Missing filter + Sort + Page size + Refresh -->
			<div class="flex flex-wrap items-center gap-3">
				<USelectMenu
					v-model="missingFilter"
					:items="missingOptions"
					value-key="id"
					class="w-full md:w-44"
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
					@click="fetchArtists"
				/>
			</div>
		</div>

		<!-- Top Pagination -->
		<div
			v-if="totalPages > 1"
			class="border-cb-quinary-900 bg-cb-quaternary-950 flex items-center justify-between rounded-lg border px-4 py-3"
		>
			<p class="text-cb-tertiary-500 text-sm">
				Page {{ currentPage }} of {{ totalPages }}
			</p>
			<UPagination
				v-model:page="currentPage"
				:total="totalArtists"
				:items-per-page="pageSizeValue"
			/>
		</div>

		<!-- Artists List -->
		<div class="bg-cb-quaternary-950 overflow-hidden rounded-lg">
			<!-- Loading state -->
			<div v-if="isLoading && artistsList.length === 0" class="space-y-2 p-4">
				<SkeletonDefault v-for="i in 5" :key="i" class="h-16 w-full rounded-lg" />
			</div>

			<!-- Empty state -->
			<div v-else-if="!isLoading && artistsList.length === 0" class="py-16 text-center">
				<UIcon
					name="i-heroicons-user-group"
					class="text-cb-tertiary-500 mx-auto size-16 opacity-50"
				/>
				<p class="text-cb-tertiary-500 mt-4">No artist found</p>
			</div>

			<!-- Artists -->
			<div v-else class="divide-cb-quinary-900 divide-y">
				<div
					v-for="artist in artistsList"
					:key="artist.id"
					class="hover:bg-cb-quinary-900/30 group flex items-center gap-4 p-3 transition-colors"
					:class="{ 'bg-gray-900/20': getMissingData(artist).length > 0 }"
				>
					<!-- Image -->
					<NuxtLink :to="`/artist/${artist.id}`" class="shrink-0">
						<NuxtImg
							v-if="artist.image"
							:src="artist.image"
							:alt="artist.name"
							format="webp"
							class="size-12 rounded-full object-cover"
						/>
						<div
							v-else
							class="bg-cb-quinary-900 flex size-12 items-center justify-center rounded-full"
						>
							<UIcon name="i-heroicons-user" class="text-cb-tertiary-500 size-6" />
						</div>
					</NuxtLink>

					<!-- Info -->
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<NuxtLink
								:to="`/artist/${artist.id}`"
								class="hover:text-cb-primary-900 truncate font-semibold transition-colors"
							>
								{{ artist.name }}
							</NuxtLink>
							<UBadge :color="getTypeBadgeColor(artist.type)" variant="subtle" size="xs">
								{{ artist.type || 'N/A' }}
							</UBadge>
							<UBadge
								:color="getGenderBadgeColor(artist.gender)"
								variant="subtle"
								size="xs"
							>
								{{ artist.gender || 'N/A' }}
							</UBadge>
							<UBadge
								v-if="!artist.active_career"
								color="neutral"
								variant="subtle"
								size="xs"
							>
								Inactive
							</UBadge>
						</div>

						<!-- Description excerpt -->
						<p
							v-if="artist.description"
							class="text-cb-tertiary-500 mt-0.5 line-clamp-1 text-xs"
							:title="artist.description"
						>
							{{ artist.description }}
						</p>

						<!-- Styles -->
						<div
							v-if="artist.styles && artist.styles.length"
							class="mt-1 flex flex-wrap gap-1"
						>
							<span
								v-for="style in artist.styles.slice(0, 3)"
								:key="style"
								class="bg-cb-quinary-900 rounded px-1.5 py-0.5 text-xs"
							>
								{{ style }}
							</span>
							<span v-if="artist.styles.length > 3" class="text-cb-tertiary-500 text-xs">
								+{{ artist.styles.length - 3 }}
							</span>
						</div>

						<!-- Groups -->
						<div
							v-if="artist.groups && artist.groups.length"
							class="mt-1 flex flex-wrap items-center gap-1"
						>
							<span class="text-cb-tertiary-500 text-xs">Groups:</span>
							<NuxtLink
								v-for="group in artist.groups"
								:key="group.id"
								:to="`/artist/${group.id}`"
								class="hover:text-cb-primary-900 bg-cb-quinary-900 rounded px-1.5 py-0.5 text-xs transition-colors"
							>
								{{ group.name }}
							</NuxtLink>
						</div>

						<!-- Missing data indicators & counts -->
						<div class="mt-1 flex flex-wrap items-center gap-2">
							<!-- Missing description -->
							<span
								v-if="getMissingData(artist).includes('desc')"
								class="text-xs text-gray-400"
								title="No description"
							>
								<UIcon name="i-heroicons-document-text" class="size-3.5" />
								desc
							</span>
							<!-- Missing styles -->
							<span
								v-if="getMissingData(artist).includes('styles')"
								class="text-xs text-gray-400"
								title="No styles"
							>
								<UIcon name="i-heroicons-tag" class="size-3.5" />
								styles
							</span>
							<!-- Socials count or missing -->
							<span
								v-if="artist.social_links && artist.social_links.length > 0"
								class="text-xs text-green-500"
								title="Social links"
							>
								<UIcon name="i-heroicons-share" class="size-3.5" />
								{{ artist.social_links.length }} socials
							</span>
							<span v-else class="text-xs text-gray-400" title="No social links">
								<UIcon name="i-heroicons-share" class="size-3.5" />
								socials
							</span>
							<!-- Platforms count or missing -->
							<span
								v-if="artist.platform_links && artist.platform_links.length > 0"
								class="text-xs text-green-500"
								title="Platforms"
							>
								<UIcon name="i-heroicons-musical-note" class="size-3.5" />
								{{ artist.platform_links.length }} platforms
							</span>
							<span v-else class="text-xs text-gray-400" title="No platforms">
								<UIcon name="i-heroicons-musical-note" class="size-3.5" />
								platforms
							</span>
						</div>
						<span
							v-if="getMissingData(artist).length > 0"
							class="mt-1 inline-flex rounded bg-gray-500/10 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-gray-300 uppercase"
							:title="`Missing fields: ${getMissingLabels(artist).join(', ')}`"
						>
							Incomplete
						</span>
					</div>

					<!-- Dates -->
					<div class="text-cb-tertiary-500 hidden text-right text-xs lg:block">
						<p>Created: {{ formatDate(artist.created_at) }}</p>
						<p>Updated: {{ formatDate(artist.updated_at) }}</p>
					</div>

					<!-- Actions -->
					<div
						class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
					>
						<UButton
							:to="`/artist/edit/${artist.id}`"
							icon="i-heroicons-pencil-square"
							color="neutral"
							variant="ghost"
							size="sm"
							target="_blank"
						/>
						<UButton
							v-if="artist.id_youtube_music"
							:to="`https://music.youtube.com/channel/${artist.id_youtube_music}`"
							icon="i-heroicons-musical-note"
							color="neutral"
							variant="ghost"
							size="sm"
							target="_blank"
							aria-label="YouTube Music"
						/>
						<UButton
							v-if="artist.id_youtube_music"
							icon="i-heroicons-no-symbol"
							color="warning"
							variant="ghost"
							size="sm"
							aria-label="Ban"
							@click="openBanModal(artist)"
						/>
						<UButton
							icon="i-heroicons-trash"
							color="error"
							variant="ghost"
							size="sm"
							@click="openDeleteModal(artist)"
						/>
						<UButton
							:to="`/artist/${artist.id}`"
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
					Page {{ currentPage }} of {{ totalPages }}
				</p>
				<UPagination
					v-model:page="currentPage"
					:total="totalArtists"
					:items-per-page="pageSizeValue"
				/>
			</div>
		</div>

		<!-- Delete Confirmation Modal -->
		<ModalConfirmDeleteArtist
			:is-open="isDeleteModalOpen"
			:artist-id="deletingArtist?.id || ''"
			:artist-name="deletingArtist?.name || ''"
			@close="isDeleteModalOpen = false"
			@confirm="confirmDelete"
		/>

		<!-- Ban Confirmation Modal -->
		<ModalBanArtist
			:is-open="isBanModalOpen"
			:artist-id="banningArtist?.id || ''"
			:artist-name="banningArtist?.name || ''"
			:artist-ytm-id="banningArtist?.id_youtube_music || ''"
			@close="isBanModalOpen = false"
			@confirm="confirmBan"
		/>
	</div>
</template>
