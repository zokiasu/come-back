<script setup lang="ts">
	import type { Artist, ArtistType } from '~/types'
	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
	import { useSupabaseUserArtistContributions } from '~/composables/Supabase/useSupabaseUserArtistContributions'

	const toast = useToast()
	const { getArtistsByPage, approveArtist } = useSupabaseArtist()
	const { getCreatorsForArtists } = useSupabaseUserArtistContributions()

	// Data state
	const artistsList = ref<Artist[]>([])
	const isLoading = ref(false)
	const totalArtists = ref(0)
	const creatorMap = ref<
		Map<string, { id: string; name: string; email: string; photo_url: string | null }>
	>(new Map())

	// Action states
	const approvingId = ref<string | null>(null)

	// Filters state
	const search = ref('')
	const typeFilter = ref<string>('ALL')
	const genderFilter = ref<string>('ALL')
	const onlyWithStyles = ref(false)

	// Sorting state
	const sortColumn = ref<string>('created_at')
	const sortDirection = ref<'asc' | 'desc'>('desc')

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

	const sortOptions: { label: string; id: string }[] = [
		{ label: 'Created date', id: 'created_at' },
		{ label: 'Name', id: 'name' },
		{ label: 'Type', id: 'type' },
	]

	const pageSizeOptions: { label: string; id: number }[] = [
		{ label: '20 per page', id: 20 },
		{ label: '50 per page', id: 50 },
		{ label: '100 per page', id: 100 },
	]

	// Fetch unverified artists
	const fetchArtists = async () => {
		isLoading.value = true

		try {
			const result = await getArtistsByPage(currentPage.value, pageSizeValue.value, {
				search: search.value || undefined,
				type: typeFilter.value === 'ALL' ? undefined : (typeFilter.value as ArtistType),
				gender: genderFilter.value === 'ALL' ? undefined : genderFilter.value,
				onlyWithStyles: onlyWithStyles.value || undefined,
				verified: null,
				skipYoutubeMusicFilter: true,
				orderBy: sortColumn.value as keyof Artist,
				orderDirection: sortDirection.value,
			})

			artistsList.value = result.artists
			totalArtists.value = result.total

			// Batch load creators
			if (result.artists.length > 0) {
				const artistIds = result.artists.map((a) => a.id)
				const creators = await getCreatorsForArtists(artistIds)
				const map = new Map<
					string,
					{ id: string; name: string; email: string; photo_url: string | null }
				>()
				for (const c of creators) {
					const user = c.user as
						| { id: string; name: string; email: string; photo_url: string | null }
						| undefined
					if (user) {
						map.set(c.artist_id, user)
					}
				}
				creatorMap.value = map
			}
		} catch (error) {
			console.error('Error while fetching artists:', error)
			toast.add({
				title: 'Error',
				description: 'Error while loading pending artists',
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	// Approve an artist
	const handleApprove = async (artist: Artist) => {
		approvingId.value = artist.id
		try {
			await approveArtist(artist.id)
			toast.add({
				title: 'Artist approved',
				description: `${artist.name} was approved successfully`,
				color: 'success',
			})
			artistsList.value = artistsList.value.filter((a) => a.id !== artist.id)
			totalArtists.value--
		} catch {
			// Error already handled in composable
		} finally {
			approvingId.value = null
		}
	}

	// Reject (delete) - opens confirmation modal
	const openRejectModal = (artist: Artist) => {
		deletingArtist.value = artist
		isDeleteModalOpen.value = true
	}

	const confirmReject = () => {
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

	// Format date
	const formatDate = (dateString: string | null) => {
		if (!dateString) return '-'
		return new Date(dateString).toLocaleDateString('sv-SE', {
			day: '2-digit',
			month: '2-digit',
			year: '2-digit',
		})
	}

	const formatProfileDate = (dateString: string | null) => {
		if (!dateString) return '-'
		return new Date(dateString).toLocaleDateString('sv-SE', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
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
		[typeFilter, genderFilter, onlyWithStyles, sortColumn, sortDirection, pageSizeValue],
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
	onMounted(() => {
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
				<h1 class="text-2xl font-bold">Artist Validation</h1>
				<p class="text-cb-tertiary-500 text-sm">
					Artists submitted by the community and waiting for review
				</p>
			</div>

			<!-- Stats cards -->
			<div class="flex flex-wrap gap-2">
				<div class="rounded-lg bg-amber-900/30 px-3 py-1.5 text-center">
					<p class="text-lg font-bold text-amber-400">{{ totalArtists }}</p>
					<p class="text-xs text-amber-400/70">Pending</p>
				</div>
			</div>
		</div>

		<!-- Filters -->
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

				<UCheckbox v-model="onlyWithStyles" label="Has styles only" class="shrink-0" />

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
						class="cursor-pointer"
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
					class="cursor-pointer"
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
					name="i-lucide-badge-check"
					class="text-cb-tertiary-500 mx-auto size-16 opacity-50"
				/>
				<p class="text-cb-tertiary-500 mt-4">No artist pending validation</p>
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
					<NuxtLink :to="`/artist/${artist.id}`" class="shrink-0" target="_blank">
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

					<!-- Info -->
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<NuxtLink
								:to="`/artist/${artist.id}`"
								class="hover:text-cb-primary-900 truncate font-semibold transition-colors"
								target="_blank"
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

						<!-- General tags -->
						<div
							v-if="artist.general_tags && artist.general_tags.length"
							class="mt-1 flex flex-wrap gap-1"
						>
							<span
								v-for="tag in artist.general_tags.slice(0, 3)"
								:key="tag"
								class="rounded bg-sky-900/30 px-1.5 py-0.5 text-xs text-sky-300"
							>
								{{ tag }}
							</span>
							<span
								v-if="artist.general_tags.length > 3"
								class="text-cb-tertiary-500 text-xs"
							>
								+{{ artist.general_tags.length - 3 }}
							</span>
						</div>

						<div
							v-if="artist.nationalities && artist.nationalities.length"
							class="mt-1 flex flex-wrap gap-1"
						>
							<span
								v-for="nationality in artist.nationalities.slice(0, 3)"
								:key="nationality"
								class="rounded bg-amber-900/30 px-1.5 py-0.5 text-xs text-amber-200"
							>
								{{ nationality }}
							</span>
							<span
								v-if="artist.nationalities.length > 3"
								class="text-cb-tertiary-500 text-xs"
							>
								+{{ artist.nationalities.length - 3 }}
							</span>
						</div>

						<!-- Birth & Debut dates -->
						<div class="mt-1 flex flex-wrap items-center gap-3 text-xs">
							<span
								class="flex items-center gap-1"
								:class="
									artist.birth_date ? 'text-cb-tertiary-300' : 'text-cb-tertiary-500'
								"
							>
								<UIcon name="i-lucide-cake" class="size-3.5" />
								Birth: {{ formatProfileDate(artist.birth_date) }}
							</span>
							<span
								class="flex items-center gap-1"
								:class="
									artist.debut_date ? 'text-cb-tertiary-300' : 'text-cb-tertiary-500'
								"
							>
								<UIcon name="i-lucide-calendar-days" class="size-3.5" />
								Debut: {{ formatProfileDate(artist.debut_date) }}
							</span>
						</div>

						<!-- Missing data indicators & counts -->
						<div class="mt-1 flex flex-wrap items-center gap-2">
							<!-- Missing description -->
							<span
								v-if="getMissingData(artist).includes('desc')"
								class="text-xs text-gray-400"
								title="No description"
							>
								<UIcon name="i-lucide-file-text" class="size-3.5" />
								desc
							</span>
							<!-- Missing styles -->
							<span
								v-if="getMissingData(artist).includes('styles')"
								class="text-xs text-gray-400"
								title="No styles"
							>
								<UIcon name="i-lucide-tag" class="size-3.5" />
								styles
							</span>
							<!-- Socials count or missing -->
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
							<!-- Platforms count or missing -->
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
							v-if="getMissingData(artist).length > 0"
							class="mt-1 inline-flex rounded bg-gray-500/10 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-gray-300 uppercase"
							:title="`Missing fields: ${getMissingLabels(artist).join(', ')}`"
						>
							Incomplete
						</span>

						<!-- Creator info -->
						<div class="mt-1 flex items-center gap-1.5">
							<UIcon
								name="i-lucide-circle-user-round"
								class="text-cb-tertiary-500 size-3.5"
							/>
							<span class="text-cb-tertiary-500 text-xs">
								Added by
								<span class="text-cb-tertiary-300 font-medium">
									{{ creatorMap.get(artist.id)?.name || 'Unknown' }}
								</span>
							</span>
						</div>
					</div>

					<!-- Dates -->
					<div class="text-cb-tertiary-500 hidden text-right text-xs lg:block">
						<p>Created: {{ formatDate(artist.created_at) }}</p>
					</div>

					<!-- Actions -->
					<div class="flex shrink-0 items-center gap-1">
						<UButton
							icon="i-lucide-check"
							color="success"
							variant="soft"
							size="sm"
							class="cursor-pointer"
							:loading="approvingId === artist.id"
							:disabled="approvingId !== null && approvingId !== artist.id"
							aria-label="Approve"
							@click="handleApprove(artist)"
						/>
						<UButton
							v-if="artist.id_youtube_music"
							icon="i-lucide-ban"
							color="warning"
							variant="soft"
							size="sm"
							class="cursor-pointer"
							:disabled="approvingId !== null"
							aria-label="Ban"
							@click="openBanModal(artist)"
						/>
						<UButton
							icon="i-lucide-x"
							color="error"
							variant="soft"
							size="sm"
							class="cursor-pointer"
							:disabled="approvingId !== null"
							aria-label="Reject"
							@click="openRejectModal(artist)"
						/>
						<ComebackExternalLink
							v-if="artist.id_youtube_music"
							name="YouTube Music"
							:link="`https://music.youtube.com/channel/${artist.id_youtube_music}`"
							class="!px-1.5 !py-1"
						/>
						<UButton
							:to="`/artist/edit/${artist.id}`"
							icon="i-lucide-pencil"
							color="neutral"
							variant="ghost"
							size="sm"
							target="_blank"
							class="cursor-pointer"
							aria-label="Edit"
						/>
						<UButton
							:to="`/artist/${artist.id}`"
							icon="i-lucide-square-arrow-out-up-right"
							color="neutral"
							variant="ghost"
							size="sm"
							target="_blank"
							class="cursor-pointer"
							aria-label="View"
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
			@confirm="confirmReject"
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
