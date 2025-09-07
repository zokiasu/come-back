<template>
	<div class="relative">
		<!-- Search field -->
		<UInput
			v-model="searchQuery"
			:placeholder="placeholder"
			:disabled="disabled"
			size="lg"
			icon="i-heroicons-magnifying-glass"
			class="w-full"
			@input="onSearchInput"
			@focus="showDropdown = true"
		>
			<template #trailing>
				<UButton
					v-if="searchQuery && !disabled"
					icon="i-heroicons-x-mark"
					color="neutral"
					variant="ghost"
					size="xs"
					@click="clearSearch"
				/>
			</template>
		</UInput>

		<!-- Results dropdown -->
		<div
			v-if="
				showDropdown &&
				(artistOptions.length > 0 || (searchQuery.length > 2 && !isSearching))
			"
			class="absolute top-full right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
		>
			<!-- Artist options -->
			<div v-if="artistOptions.length > 0" class="py-1">
				<button
					v-for="artist in artistOptions"
					:key="artist.id"
					type="button"
					class="flex w-full items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
					@click="selectArtist(artist)"
				>
					<UAvatar v-if="artist.image" :src="artist.image" :alt="artist.name" size="sm" />
					<UIcon v-else name="i-heroicons-user" class="h-8 w-8 text-gray-400" />
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-gray-900 dark:text-white">
							{{ artist.name }}
						</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">
							{{ getArtistTypeLabel(artist.type || 'SOLO') }}
							<span v-if="artist.verified" class="text-primary-500 ml-1">• Verified</span>
						</p>
					</div>
				</button>
			</div>

			<!-- Message when no artist found -->
			<div
				v-else-if="searchQuery.length > 2 && !isSearching"
				class="px-4 py-4 text-center"
			>
				<UIcon
					name="i-heroicons-magnifying-glass"
					class="mx-auto mb-2 h-6 w-6 text-gray-400"
				/>
				<p class="text-sm text-gray-500">No artist found for "{{ searchQuery }}"</p>
				<p class="mt-1 text-xs text-gray-400">
					Only existing artists can be selected
				</p>
			</div>

			<!-- Loading -->
			<div v-else-if="isSearching" class="px-4 py-4 text-center">
				<UIcon
					name="i-heroicons-arrow-path"
					class="mx-auto mb-2 h-5 w-5 animate-spin text-gray-400"
				/>
				<p class="text-sm text-gray-500">Searching...</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { Artist } from '~/types'
	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'

	const props = withDefaults(
		defineProps<{
			modelValue: string
			placeholder: string
			disabled: boolean
		}>(),
		{
			placeholder: 'Search for an artist...',
			disabled: false,
		},
	)

	// Emits
	const emit = defineEmits<{
		'update:modelValue': [value: string]
		'artist-selected': [artist: Artist]
	}>()

	// Composables
	const { getAllArtists } = useSupabaseArtist()

	// État
	const searchQuery = ref('')
	const showDropdown = ref(false)
	const isSearching = ref(false)
	const selectedArtist = ref<Artist | null>(null)
	const artistOptions = ref<Artist[]>([])

	// Fonction pour obtenir le label du type d'artiste
	const getArtistTypeLabel = (type: string) => {
		switch (type) {
			case 'SOLO':
				return 'Solo'
			case 'GROUP':
				return 'Group'
			case 'COLLECTIVE':
				return 'Collective'
			default:
				return type
		}
	}

	// Debounce pour la recherche
	let searchTimeout: NodeJS.Timeout | null = null

	// Fonction de recherche d'artistes
	const searchArtists = async (query: string) => {
		if (!query || query.length < 2) {
			artistOptions.value = []
			return
		}

		isSearching.value = true

		try {
			const artists = await getAllArtists({
				search: query,
				limit: 10,
				orderBy: 'name',
				orderDirection: 'asc',
			})

			artistOptions.value = artists || []
		} catch (error) {
			console.error("Error searching for artists:", error)
			artistOptions.value = []
		} finally {
			isSearching.value = false
		}
	}

	// Gestion de l'input de recherche avec debounce
	const onSearchInput = () => {
		if (searchTimeout) {
			clearTimeout(searchTimeout)
		}

		searchTimeout = setTimeout(() => {
			searchArtists(searchQuery.value)
		}, 300)
	}

	// Sélection d'un artiste
	const selectArtist = (artist: Artist) => {
		selectedArtist.value = artist
		searchQuery.value = artist.name
		showDropdown.value = false

		emit('update:modelValue', artist.id)
		emit('artist-selected', artist)
	}

	// Effacer la recherche
	const clearSearch = () => {
		searchQuery.value = ''
		selectedArtist.value = null
		artistOptions.value = []
		showDropdown.value = false
		emit('update:modelValue', '')
	}

	// Fermer le dropdown en cliquant à l'extérieur
	const closeDropdown = (event: Event) => {
		const target = event.target as HTMLElement
		if (!target.closest('.relative')) {
			showDropdown.value = false
		}
	}

	// Watcher pour la prop modelValue
	watch(
		() => props.modelValue,
		async (newValue) => {
			if (newValue && !selectedArtist.value) {
				// Load the artist if we have an ID but no selected artist
				try {
					const artists = await getAllArtists({ limit: 100 })
					const artist = artists?.find((a) => a.id === newValue)
					if (artist) {
						selectedArtist.value = artist
						searchQuery.value = artist.name
					}
				} catch (error) {
					console.error("Error loading artist:", error)
				}
			} else if (!newValue) {
				selectedArtist.value = null
				searchQuery.value = ''
			}
		},
	)

	// Cycle de vie
	if (import.meta.client) {
		document.addEventListener('click', closeDropdown)
		document.removeEventListener('click', closeDropdown)
	}

	onMounted(() => {
		if (import.meta.client) {
			document.addEventListener('click', closeDropdown)
		}
	})

	onUnmounted(() => {
		if (import.meta.client) {
			document.removeEventListener('click', closeDropdown)
		}
		if (searchTimeout) {
			clearTimeout(searchTimeout)
		}
	})
</script>
