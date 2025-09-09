<script setup lang="ts">
	import { ref, watchEffect } from 'vue'
	import { useDebounce } from '~/composables/useDebounce'

	// Initialize reactive variables
	const searchInput = ref('')
	const datas = ref([])
	const isOpen = ref(false)

	// Use Algolia Search in an optimized way
	const { result, search } = useAlgoliaSearch('ARTISTS')

	// Define a debounced search function
	const debouncedSearch = useDebounce(async (query: any) => {
		await useAsyncData('ssr-search-results', () => search({ query }))
		if (!result.value) return
		console.log(result.value.hits)
		datas.value = result.value.hits.slice(0, 10)
	}, 500) // Wait 500ms after the last call before executing the function

	watchEffect(() => {
		if (searchInput.value.length > 2) {
			debouncedSearch(searchInput.value)
		}
	})

	const closeModal = () => {
		isOpen.value = false
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
				<div v-if="datas.length" class="flex flex-col gap-2">
					<LazyNuxtLink
						v-for="artist in datas"
						:key="artist.objectID"
						:to="`/artist/${artist.objectID}`"
						@click="closeModal"
					>
						<p class="bg-cb-primary-900 w-full rounded p-2 text-xs">{{ artist.name }}</p>
					</LazyNuxtLink>
				</div>
			</div>
		</template>
	</UModal>
</template>
