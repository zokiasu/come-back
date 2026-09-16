<script setup lang="ts">
	import type { Artist, ArtistType, Nationality } from '~/types'
	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
	import { useSupabaseNationalities } from '~/composables/Supabase/useSupabaseNationalities'
	import {
		ARTIST_GENDER_FILTER_OPTIONS,
		ARTIST_TYPE_FILTER_OPTIONS,
		getArtistGenderBadgeColor,
		getArtistMissingData,
		getArtistMissingLabels,
		getArtistTypeBadgeColor,
	} from '~/utils/artist'
	import { DASHBOARD_PAGE_SIZE_OPTIONS } from '~/constants/dashboard'
	import { formatDate as formatDateValue } from '~/utils/date'

	const toast = useToast()
	const { getArtistsByPage } = useSupabaseArtist()
	const { getAllNationalities } = useSupabaseNationalities()

	const { trace: logDashboardArtistTrace } = useLogger('DashboardArtist')

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

	const sortColumn = ref<keyof Artist>('name')
	const sortDirection = ref<'asc' | 'desc'>('asc')

	// Delete modal state
	const isDeleteModalOpen = ref(false)
	const deletingArtist = ref<Artist | null>(null)

	// Ban modal state
	const isBanModalOpen = ref(false)
	const banningArtist = ref<Artist | null>(null)

	// Select menu options
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

	// Fetch artists
	const fetchArtists = async () => {
		isLoading.value = true
		logDashboardArtistTrace('fetchArtists started', {
			page: currentPage.value,
			pageSize: pageSizeValue.value,
			search: search.value,
			typeFilter: typeFilter.value,
			genderFilter: genderFilter.value,
			styleFilter: styleFilter.value,
			nationalityFilter: nationalityFilter.value,
			careerFilter: careerFilter.value,
			missingFilter: missingFilter.value,
		})

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
				skipYoutubeMusicFilter: true,
				orderBy: sortColumn.value,
				orderDirection: sortDirection.value,
			})

			artistsList.value = result.artists
			totalArtists.value = result.total
			logDashboardArtistTrace('fetchArtists resolved', {
				received: result.artists.length,
				total: result.total,
				page: currentPage.value,
			})
		} catch (error) {
			console.error('Error while fetching artists:', error)
			console.error('[DashboardArtist] fetchArtists failed', {
				error,
				page: currentPage.value,
				search: search.value,
			})
			toast.add({
				title: 'Error',
				description: 'Error while loading artists',
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	const { currentPage, pageSizeValue } = useDashboardTable({
		fetch: fetchArtists,
		filterSources: [
			typeFilter,
			genderFilter,
			styleFilter,
			nationalityFilter,
			careerFilter,
			missingFilter,
			sortColumn,
			sortDirection,
		],
		searchSource: search,
	})

	const totalPages = computed(() => Math.ceil(totalArtists.value / pageSizeValue.value))

	const loadNationalities = async () => {
		try {
			nationalitiesList.value = await getAllNationalities()
			logDashboardArtistTrace('nationalities loaded', {
				count: nationalitiesList.value.length,
			})
		} catch (error) {
			console.error('[DashboardArtist] Failed to load nationalities', error)
			toast.add({
				title: 'Warning',
				description: 'Nationalities filters could not be loaded',
				color: 'warning',
			})
		}
	}

	// Format date
	const formatDate = (dateString: string | null) => {
		if (!dateString) return '-'
		return formatDateValue(dateString, {
			day: '2-digit',
			month: '2-digit',
			year: '2-digit',
		})
	}

	// Delete modal
	const openDeleteModal = (artist: Artist) => {
		deletingArtist.value = artist
		isDeleteModalOpen.value = true
	}

	const confirmDelete = () => {
		// Deletion is handled by the ModalConfirmDeleteArtist component
		// On ferme juste the modal and on refresh
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

	useDashboardPaginationKeyboard(currentPage, totalPages)

	onMounted(async () => {
		await loadNationalities()
	})

	definePageMeta({
		middleware: ['admin'],
		layout: 'dashboard',
		ssr: false,
	})
</script>

<template>
	<DashboardPageShell>
		<div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
			<div>
				<h1 class="text-2xl font-bold">Artist Management</h1>
				<p class="text-cb-tertiary-500 text-sm">
					{{ artistsList.length }} / {{ totalArtists }} artists loaded
				</p>
			</div>

			<CardDashboardArtistStats :artists="artistsList" :total="totalArtists" />
		</div>

		<div class="bg-cb-quaternary-950 space-y-3 rounded-lg p-4">
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
					:items="ARTIST_TYPE_FILTER_OPTIONS"
					value-key="id"
					class="w-full md:w-36"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>

				<USelectMenu
					v-model="genderFilter"
					:items="ARTIST_GENDER_FILTER_OPTIONS"
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
								? 'i-lucide-arrow-up-narrow-wide'
								: 'i-lucide-arrow-down-wide-narrow'
						"
						color="neutral"
						variant="ghost"
						@click="sortDirection = toggledSortDirection(sortDirection)"
					/>
				</div>

				<USelectMenu
					v-model="pageSizeValue"
					:items="DASHBOARD_PAGE_SIZE_OPTIONS"
					value-key="id"
					class="w-full md:w-36"
					:ui="{ base: 'bg-cb-quinary-900' }"
				/>

				<UButton
					icon="i-lucide-refresh-cw"
					color="neutral"
					variant="ghost"
					:loading="isLoading"
					@click="fetchArtists"
				/>
			</div>
		</div>

		<DashboardPaginationBar
			v-model:page="currentPage"
			:total-pages="totalPages"
			:total="totalArtists"
			:items-per-page="pageSizeValue"
		/>

		<div class="bg-cb-quaternary-950 overflow-hidden rounded-lg">
			<div v-if="isLoading && artistsList.length === 0" class="space-y-2 p-4">
				<SkeletonDefault v-for="i in 5" :key="i" class="h-16 w-full rounded-lg" />
			</div>

			<DashboardEmptyState
				v-else-if="!isLoading && artistsList.length === 0"
				icon="i-lucide-users"
				title="No artist found"
			/>

			<div v-else class="divide-cb-quinary-900 divide-y">
				<div
					v-for="artist in artistsList"
					:key="artist.id"
					class="hover:bg-cb-quinary-900/30 group flex items-center gap-4 p-3 transition-colors"
					:class="{ 'bg-gray-900/20': getArtistMissingData(artist).length > 0 }"
				>
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
							<UIcon name="i-lucide-user" class="text-cb-tertiary-500 size-6" />
						</div>
					</NuxtLink>

					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<NuxtLink
								:to="`/artist/${artist.id}`"
								class="hover:text-cb-primary-900 truncate font-semibold transition-colors"
							>
								{{ artist.name }}
							</NuxtLink>
							<UBadge
								:color="getArtistTypeBadgeColor(artist.type)"
								variant="subtle"
								size="xs"
							>
								{{ artist.type || 'N/A' }}
							</UBadge>
							<UBadge
								:color="getArtistGenderBadgeColor(artist.gender)"
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

						<p
							v-if="artist.description"
							class="text-cb-tertiary-500 mt-0.5 line-clamp-1 text-xs"
							:title="artist.description"
						>
							{{ artist.description }}
						</p>

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

						<div class="mt-1 flex flex-wrap items-center gap-2">
							<span
								v-if="getArtistMissingData(artist).includes('desc')"
								class="text-xs text-gray-400"
								title="No description"
							>
								<UIcon name="i-lucide-file-text" class="size-3.5" />
								desc
							</span>
							<span
								v-if="getArtistMissingData(artist).includes('styles')"
								class="text-xs text-gray-400"
								title="No styles"
							>
								<UIcon name="i-lucide-tag" class="size-3.5" />
								styles
							</span>
							<span
								v-if="artist.social_links && artist.social_links.length > 0"
								class="text-xs text-green-500"
								title="Social links"
							>
								<UIcon name="i-lucide-share-2" class="size-3.5" />
								{{ artist.social_links.length }} socials
							</span>
							<span v-else class="text-xs text-gray-400" title="No social links">
								<UIcon name="i-lucide-share-2" class="size-3.5" />
								socials
							</span>
							<span
								v-if="artist.platform_links && artist.platform_links.length > 0"
								class="text-xs text-green-500"
								title="Platforms"
							>
								<UIcon name="i-lucide-music" class="size-3.5" />
								{{ artist.platform_links.length }} platforms
							</span>
							<span v-else class="text-xs text-gray-400" title="No platforms">
								<UIcon name="i-lucide-music" class="size-3.5" />
								platforms
							</span>
						</div>
						<span
							v-if="getArtistMissingData(artist).length > 0"
							class="mt-1 inline-flex rounded bg-gray-500/10 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-gray-300 uppercase"
							:title="`Missing fields: ${getArtistMissingLabels(artist).join(', ')}`"
						>
							Incomplete
						</span>
					</div>

					<div class="text-cb-tertiary-500 hidden text-right text-xs lg:block">
						<p>Created: {{ formatDate(artist.created_at) }}</p>
						<p>Updated: {{ formatDate(artist.updated_at) }}</p>
					</div>

					<div
						class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
					>
						<UButton
							:to="`/artist/edit/${artist.id}`"
							icon="i-lucide-pencil"
							color="neutral"
							variant="ghost"
							size="sm"
							target="_blank"
						/>
						<UButton
							v-if="artist.id_youtube_music"
							:to="`https://music.youtube.com/channel/${artist.id_youtube_music}`"
							icon="i-lucide-music"
							color="neutral"
							variant="ghost"
							size="sm"
							target="_blank"
							aria-label="YouTube Music"
						/>
						<UButton
							v-if="artist.id_youtube_music"
							icon="i-lucide-ban"
							color="warning"
							variant="ghost"
							size="sm"
							aria-label="Ban"
							@click="openBanModal(artist)"
						/>
						<UButton
							icon="i-lucide-trash-2"
							color="error"
							variant="ghost"
							size="sm"
							@click="openDeleteModal(artist)"
						/>
						<UButton
							:to="`/artist/${artist.id}`"
							icon="i-lucide-square-arrow-out-up-right"
							color="neutral"
							variant="ghost"
							size="sm"
							target="_blank"
						/>
					</div>
				</div>
			</div>

			<DashboardPaginationBar
				v-model:page="currentPage"
				:total-pages="totalPages"
				:total="totalArtists"
				:items-per-page="pageSizeValue"
				embedded
			/>
		</div>

		<ModalConfirmDeleteArtist
			:is-open="isDeleteModalOpen"
			:artist-id="deletingArtist?.id || ''"
			:artist-name="deletingArtist?.name || ''"
			@close="isDeleteModalOpen = false"
			@confirm="confirmDelete"
		/>

		<ModalBanArtist
			:is-open="isBanModalOpen"
			:artist-id="banningArtist?.id || ''"
			:artist-name="banningArtist?.name || ''"
			:artist-ytm-id="banningArtist?.id_youtube_music || ''"
			@close="isBanModalOpen = false"
			@confirm="confirmBan"
		/>
	</DashboardPageShell>
</template>
