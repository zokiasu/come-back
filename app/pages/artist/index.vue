<template>
	<div class="container mx-auto space-y-6 py-10">
		<!-- Search bar -->
		<div class="flex items-center gap-2">
			<UInput
				v-model="search"
				type="text"
				placeholder="Search for an artist..."
				size="lg"
				icon="i-heroicons-magnifying-glass"
				class="w-full"
			/>
			<UButton
				label="Filters"
				:trailing-icon="
					filtersExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'
				"
				class="bg-cb-primary-700/10 lg:bg-cb-primary-900 lg:hover:bg-cb-primary-900/90 h-full w-fit items-center justify-center rounded text-white lg:cursor-pointer lg:px-5"
				@click="toggleFilters"
			/>
		</div>

		<!-- Section des filtres -->
		<Transition
			enter-active-class="transition-all duration-300 ease-out"
			enter-from-class="opacity-0 max-h-0 overflow-hidden"
			enter-to-class="opacity-100 max-h-96 overflow-visible"
			leave-active-class="transition-all duration-300 ease-in"
			leave-from-class="opacity-100 max-h-96 overflow-visible"
			leave-to-class="opacity-0 max-h-0 overflow-hidden"
		>
			<UCard v-show="filtersExpanded">
				<div class="space-y-6">
					<!-- Filters by type and genre on the same line -->
					<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
						<!-- Artist type -->
						<div>
							<label class="mb-3 block text-sm font-medium text-gray-300">
								Artist type
							</label>
							<div class="flex flex-wrap gap-2">
								<UButton
									v-for="type in artistTypes"
									:key="type"
									@click="selectedType = selectedType === type ? null : type"
									:variant="selectedType === type ? 'solid' : 'outline'"
									:color="selectedType === type ? 'primary' : 'neutral'"
									size="sm"
									:disabled="isLoading"
									:class="{ 'text-white': selectedType === type }"
								>
									{{ type === 'SOLO' ? 'Solo' : 'Group' }}
								</UButton>
							</div>
						</div>

						<!-- Gender -->
						<div>
							<label class="mb-3 block text-sm font-medium text-gray-300">Gender</label>
							<div class="flex flex-wrap gap-2">
								<UButton
									v-for="gender in genderList"
									:key="gender"
									@click="toggleGender(gender)"
									:variant="selectedGender === gender ? 'solid' : 'outline'"
									:color="selectedGender === gender ? 'primary' : 'neutral'"
									size="sm"
									:disabled="isLoading"
									:class="{ 'text-white': selectedGender === gender }"
								>
									{{ formatGenderLabel(gender) }}
								</UButton>
							</div>
						</div>
					</div>

					<!-- Tags -->
					<div v-if="tagsList.length > 0">
						<label class="mb-3 block text-sm font-medium text-gray-300">
							Tags
							<span v-if="selectedTags.length > 0" class="text-xs text-gray-400">
								({{ selectedTags.length }} selected)
							</span>
						</label>
						<div class="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
							<UBadge
								v-for="tag in tagsList"
								:key="tag.id"
								@click="toggleTag(tag.name)"
								:variant="selectedTags.includes(tag.name) ? 'solid' : 'soft'"
								:color="selectedTags.includes(tag.name) ? 'primary' : 'neutral'"
								class="cursor-pointer transition-all hover:scale-105"
								:class="{
									'cursor-not-allowed opacity-50': isLoading,
									'text-white': selectedTags.includes(tag.name),
								}"
							>
								{{ tag.name }}
							</UBadge>
						</div>
					</div>

					<!-- Styles musicaux -->
					<div v-if="stylesList.length > 0">
						<label class="mb-3 block text-sm font-medium text-gray-300">
							Music styles
							<span v-if="selectedStyles.length > 0" class="text-xs text-gray-400">
								({{ selectedStyles.length }} selected)
							</span>
						</label>
						<div class="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
							<UBadge
								v-for="style in stylesList"
								:key="style.id"
								@click="toggleStyle(style.name)"
								:variant="selectedStyles.includes(style.name) ? 'solid' : 'soft'"
								:color="selectedStyles.includes(style.name) ? 'primary' : 'neutral'"
								class="cursor-pointer transition-all hover:scale-105"
								:class="{
									'cursor-not-allowed opacity-50': isLoading,
									'text-white': selectedStyles.includes(style.name),
								}"
							>
								{{ style.name }}
							</UBadge>
						</div>
					</div>
				</div>
			</UCard>
		</Transition>

		<transition-group
			tag="div"
			leave-active-class="animate__bounceOut"
			enter-active-class="animate__bounceIn"
			class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3.5 lg:grid-cols-6 xl:grid-cols-8"
		>
			<CardObject
				v-for="artist in artists"
				:key="artist.id"
				is-artist
				:artist-id="artist.id"
				:main-title="artist.name"
				:image="artist.image || ''"
				:release-date="artist.debut_date || ''"
				:release-type="artist.type || ''"
				:object-link="`/artist/${artist.id}`"
				date-always-display
				class="!min-w-full"
			/>
		</transition-group>

		<LoadingIndicator
			:show="isLoading && firstLoad"
			message="Chargement des artistes..."
		/>

		<LoadingIndicator
			:show="isLoading && !firstLoad"
			message="Chargement de plus d'artistes..."
		/>
		<div v-if="!hasMore && artists.length > 0" class="py-4 text-center text-gray-400">
			All artists are displayed.
		</div>
	</div>
</template>

<script setup lang="ts">
	import { ref, watch, onMounted, computed } from 'vue'
	import { useSupabaseArtist } from '@/composables/Supabase/useSupabaseArtist'
	import { useSupabaseGeneralTags } from '@/composables/Supabase/useSupabaseGeneralTags'
	import { useSupabaseMusicStyles } from '@/composables/Supabase/useSupabaseMusicStyles'
	import { useInfiniteScroll } from '@vueuse/core'
	import type { Artist, GeneralTag, MusicStyle } from '~/types'

	const { getArtistsByPage } = useSupabaseArtist()
	const { getAllGeneralTags } = useSupabaseGeneralTags()
	const { getAllMusicStyles } = useSupabaseMusicStyles()

	const artists = ref<Artist[]>([])
	const search = ref('')
	const page = ref(1)
	const limit = ref(48)
	const isLoading = ref(false)
	const hasMore = ref(true)
	const isInitialized = ref(false)
	const firstLoad = ref(true)

	const tagsList = ref<GeneralTag[]>([])
	const selectedTags = ref<string[]>([])
	const artistTypes = ['SOLO', 'GROUP']
	const selectedType = ref<string | null>(null)
	const stylesList = ref<MusicStyle[]>([])
	const selectedStyles = ref<string[]>([])
	const genderList = ['MALE', 'FEMALE', 'MIXTE', 'OTHER', 'UNKNOWN']
	const selectedGender = ref<string | null>(null)

	// State for filter expansion
	const filtersExpanded = ref(false)

	const fetchArtists = async (reset = false) => {
		if (isLoading.value || (!hasMore.value && !reset)) return
		isLoading.value = true

		if (reset) {
			firstLoad.value = true
		} else {
			firstLoad.value = false
		}

		const result = await getArtistsByPage(page.value, limit.value, {
			search: search.value,
			general_tags: selectedTags.value.length > 0 ? selectedTags.value : undefined,
			type: selectedType.value || undefined,
			styles: selectedStyles.value.length > 0 ? selectedStyles.value : undefined,
			gender: selectedGender.value || undefined,
			orderBy: 'name',
			orderDirection: 'asc',
		})

		const artistsArray = Array.isArray(result.artists) ? result.artists : []
		if (reset) {
			artists.value = artistsArray
		} else {
			artists.value = [...artists.value, ...artistsArray]
		}
		// Il y a plus d'éléments si on a reçu exactement le nombre demandé
		hasMore.value = artistsArray.length === limit.value
		isLoading.value = false
	}

	watch([search, selectedTags, selectedType, selectedStyles, selectedGender], () => {
		// Éviter les appels pendant l'initialisation
		if (!isInitialized.value) {
			return
		}

		page.value = 1
		hasMore.value = true
		fetchArtists(true)
	})

	const loadMore = async () => {
		if (isLoading.value || !hasMore.value) return
		page.value++
		await fetchArtists()
	}

	onMounted(async () => {
		// S'assurer que page est à 1 au début
		page.value = 1

		tagsList.value = await getAllGeneralTags()
		stylesList.value = await getAllMusicStyles()
		await fetchArtists(true)
		// Marquer comme initialisé après le premier chargement
		isInitialized.value = true
	})

	useInfiniteScroll(() => (import.meta.client ? window : null), loadMore, {
		distance: 200,
		canLoadMore: () => hasMore.value && !isLoading.value,
	})

	const toggleTag = (tagName: string) => {
		if (selectedTags.value.includes(tagName)) {
			selectedTags.value = selectedTags.value.filter((t) => t !== tagName)
		} else {
			selectedTags.value = [...selectedTags.value, tagName]
		}
	}

	const toggleStyle = (styleName: string) => {
		if (selectedStyles.value.includes(styleName)) {
			selectedStyles.value = selectedStyles.value.filter((s) => s !== styleName)
		} else {
			selectedStyles.value = [...selectedStyles.value, styleName]
		}
	}

	const toggleGender = (gender: string) => {
		if (selectedGender.value === gender) {
			selectedGender.value = null
		} else {
			selectedGender.value = gender
		}
	}

	// Computed to check if there are active filters
	const hasActiveFilters = computed(() => {
		return (
			selectedTags.value.length > 0 ||
			selectedType.value !== null ||
			selectedStyles.value.length > 0 ||
			selectedGender.value !== null
		)
	})

	// Computed to count the number of active filters
	const activeFiltersCount = computed(() => {
		let count = 0
		if (selectedTags.value.length > 0) count += selectedTags.value.length
		if (selectedType.value !== null) count++
		if (selectedStyles.value.length > 0) count += selectedStyles.value.length
		if (selectedGender.value !== null) count++
		return count
	})

	// Function to clear all filters
	const clearAllFilters = () => {
		selectedTags.value = []
		selectedType.value = null
		selectedStyles.value = []
		selectedGender.value = null
	}

	// Function to format gender labels
	const formatGenderLabel = (gender: string) => {
		const labels: Record<string, string> = {
			MALE: 'Male',
			FEMALE: 'Female',
			MIXTE: 'Mixed',
			OTHER: 'Other',
			UNKNOWN: 'Unknown',
		}
		return labels[gender] || gender
	}

	// Function to toggle filter display
	const toggleFilters = () => {
		filtersExpanded.value = !filtersExpanded.value
	}
</script>
