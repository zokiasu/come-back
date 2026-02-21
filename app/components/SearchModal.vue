<script setup lang="ts">
	import { ref, watchEffect } from 'vue'
	import type { Artist } from '~/types'

	type SearchModalProps = {
		showLabel?: boolean
		label?: string
		buttonClass?: string
		layout?: 'column' | 'row'
		buttonSize?: 'xs' | 'sm' | 'md' | 'lg'
		dense?: boolean
	}

	const props = withDefaults(defineProps<SearchModalProps>(), {
		showLabel: false,
		label: 'Recherche',
		buttonClass: '',
		layout: 'column',
		buttonSize: 'sm',
		dense: false,
	})

	// Initialize reactive variables
	const searchInput = ref('')
	const artists = ref<Artist[]>([])
	const isOpen = ref(false)
	const isLoading = ref(false)

	// Use Supabase Search
	const { searchArtistsFullText } = useSupabaseSearch()

	// Define debounced search function
	const debouncedSearch = useDebounce(async (query: string) => {
		if (query.length < 2) {
			artists.value = []
			isLoading.value = false
			return
		}

		isLoading.value = true
		try {
			const result = await searchArtistsFullText({
				query,
				limit: 10,
			})
			artists.value = result.artists
		} catch (error) {
			console.error('Search error:', error)
			artists.value = []
		} finally {
			isLoading.value = false
		}
	}, 300)

	watchEffect(() => {
		debouncedSearch(searchInput.value)
	})

	const closeModal = () => {
		isOpen.value = false
		searchInput.value = ''
		artists.value = []
	}
</script>

<template>
	<UModal
		v-model:open="isOpen"
		:ui="{
			overlay: 'bg-cb-quinary-950/75',
			content: 'ring-cb-quinary-950',
		}"
	>
	<UButton
		variant="soft"
		:size="props.buttonSize"
		aria-label="Open search"
		:class="[
			props.dense
				? 'bg-cb-quinary-900/60 hover:bg-cb-quinary-900 w-auto items-center justify-center rounded-full text-white'
				: 'lg:bg-cb-quaternary-950 lg:hover:bg-cb-tertiary-200/20 w-full items-center justify-center rounded-none bg-transparent text-white lg:aspect-square lg:h-full lg:rounded lg:text-xs',
			props.buttonClass,
		]"
		@click="isOpen = true"
	>
		<span
			:class="[
				'flex items-center justify-center gap-1',
				props.layout === 'row' ? 'flex-row' : 'flex-col',
			]"
		>
			<UIcon name="material-symbols:search" class="h-5 w-5" />
			<span
				v-if="props.showLabel"
				:class="props.layout === 'row' ? 'text-xs font-semibold' : 'text-[10px] font-semibold'"
			>
				{{ props.label }}
			</span>
		</span>
	</UButton>

		<template #content>
			<div
				class="bg-cb-quinary-950/75 relative min-h-[80dvh] space-y-2 p-5 lg:min-h-[20dvh]"
			>
				<label for="search-input" class="sr-only">Search for artists</label>
				<input
					id="search-input"
					v-model="searchInput"
					type="text"
					placeholder="Search Artist..."
					aria-label="Search for artists"
					class="bg-cb-quinary-900 placeholder-cb-tertiary-200 focus:bg-cb-tertiary-200 focus:text-cb-quinary-900 focus:placeholder-cb-quinary-900 w-full rounded border-none px-5 py-2 drop-shadow-xl transition-all duration-300 ease-in-out focus:outline-none"
				/>
				<div v-if="isLoading" class="flex items-center justify-center py-4">
					<div class="text-cb-tertiary-200 text-sm">Searching...</div>
				</div>
				<ul
					v-else-if="artists.length"
					class="flex flex-col gap-2"
					role="listbox"
					aria-label="Search results"
				>
					<li v-for="artist in artists" :key="artist.id" role="option">
						<button
							type="button"
							class="bg-cb-primary-900 hover:bg-cb-primary-800 w-full cursor-pointer rounded p-2 text-left text-xs transition-colors"
							@click="
								() => {
									$router.push(`/artist/${artist.id}`)
									closeModal()
								}
							"
						>
							{{ artist.name }}
						</button>
					</li>
				</ul>
				<div v-else-if="searchInput.length >= 2" class="py-4 text-center">
					<div class="text-cb-tertiary-400 text-sm">No artists found</div>
				</div>
			</div>
		</template>
	</UModal>
</template>
