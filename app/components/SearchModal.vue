<script setup lang="ts">
	import { ref, watchEffect } from 'vue'
	import type { Artist } from '~/types'

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
				limit: 10
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
			icon="material-symbols:search"
			variant="soft"
			title="Search"
			class="lg:bg-cb-quaternary-950 lg:hover:bg-cb-tertiary-200/20 w-full items-center justify-center rounded-none bg-transparent text-white lg:aspect-square lg:h-full lg:rounded lg:text-xs"
			@click="isOpen = true"
		/>

		<template #content>
			<div
				class="bg-cb-quinary-950/75 relative min-h-[80dvh] space-y-2 p-5 lg:min-h-[20dvh]"
			>
				<input
					id="search-input"
					v-model="searchInput"
					type="text"
					placeholder="Search Artist..."
					class="bg-cb-quinary-900 placeholder-cb-tertiary-200 focus:bg-cb-tertiary-200 focus:text-cb-quinary-900 focus:placeholder-cb-quinary-900 w-full rounded border-none px-5 py-2 drop-shadow-xl transition-all duration-300 ease-in-out focus:outline-none"
				/>
				<div v-if="isLoading" class="flex items-center justify-center py-4">
					<div class="text-cb-tertiary-200 text-sm">Searching...</div>
				</div>
				<div v-else-if="artists.length" class="flex flex-col gap-2">
					<LazyNuxtLink
						v-for="artist in artists"
						:key="artist.id"
						:to="`/artist/${artist.id}`"
						@click="closeModal"
					>
						<p class="bg-cb-primary-900 w-full rounded p-2 text-xs">{{ artist.name }}</p>
					</LazyNuxtLink>
				</div>
				<div v-else-if="searchInput.length >= 2" class="py-4 text-center">
					<div class="text-cb-tertiary-400 text-sm">No artists found</div>
				</div>
			</div>
		</template>
	</UModal>
</template>
