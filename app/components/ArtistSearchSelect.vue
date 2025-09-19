<script setup lang="ts">
	import { ref, watchEffect } from 'vue'
	import type { Artist } from '~/types'

	const searchInput = ref('')
	const suggestions = ref<Artist[]>([])
	const isLoading = ref(false)
	const modelValue = defineModel('modelValue', { default: null })

	const { searchArtistsFullText } = useSupabaseSearch()

	const debouncedSearch = useDebounce(async (query: string) => {
		if (query.length < 2) {
			suggestions.value = []
			isLoading.value = false
			return
		}

		isLoading.value = true
		try {
			const result = await searchArtistsFullText({
				query,
				limit: 10
			})
			suggestions.value = result.artists
		} catch (error) {
			console.error('Search error:', error)
			suggestions.value = []
		} finally {
			isLoading.value = false
		}
	}, 300)

	watchEffect(() => {
		debouncedSearch(searchInput.value)
	})

	function selectArtist(artist: Artist) {
		modelValue.value = artist
		searchInput.value = artist.name
		suggestions.value = []
	}

	watchEffect(() => {
		if (modelValue.value === null) {
			searchInput.value = ''
		}
	})
</script>

<template>
	<div>
		<UInput v-model="searchInput" placeholder="Search artist..." class="w-full" />
		<div v-if="isLoading" class="absolute z-10 rounded bg-white p-2 shadow">
			<div class="p-1 text-sm text-gray-500">Searching...</div>
		</div>
		<div v-else-if="suggestions.length" class="absolute z-10 rounded bg-white p-2 shadow">
			<div
				v-for="artist in suggestions"
				:key="artist.id"
				class="cursor-pointer p-1 hover:bg-gray-100"
				@click="selectArtist(artist)"
			>
				{{ artist.name }}
			</div>
		</div>
	</div>
</template>
