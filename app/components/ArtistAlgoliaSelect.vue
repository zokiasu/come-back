<script setup lang="ts">
	import { ref, watchEffect } from 'vue'
	import { useDebounce } from '~/composables/useDebounce'
	const searchInput = ref('')
	const suggestions = ref([])
	const modelValue = defineModel('modelValue', { default: null })

	const { result, search } = useAlgoliaSearch('ARTISTS')
	const debouncedSearch = useDebounce(async (query) => {
		await useAsyncData('ssr-search-results', () => search({ query }))
		if (!result.value) return
		suggestions.value = result.value.hits.slice(0, 10)
	}, 300)

	watchEffect(() => {
		if (searchInput.value.length > 2) {
			debouncedSearch(searchInput.value)
		} else {
			suggestions.value = []
		}
	})

	function selectArtist(artist) {
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
		<div v-if="suggestions.length" class="absolute z-10 rounded bg-white p-2 shadow">
			<div
				v-for="artist in suggestions"
				:key="artist.objectID"
				class="cursor-pointer p-1 hover:bg-gray-100"
				@click="selectArtist(artist)"
			>
				{{ artist.name }}
			</div>
		</div>
	</div>
</template>
