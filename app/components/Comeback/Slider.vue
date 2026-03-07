<template>
	<div class="relative h-full w-full overflow-hidden">
		<div
			class="bg-cb-quinary-900 absolute inset-0 z-10 transition-all duration-500 ease-in-out"
			:class="imageLoaded ? 'opacity-0' : 'opacity-100'"
		></div>

		<div
			v-if="validArtists.length === 0"
			class="flex h-full w-full items-center justify-center bg-black/50"
		>
			<p class="text-xl font-bold">No valid artist found</p>
		</div>

		<div v-else class="flex h-full w-full">
			<div
				v-for="artist in validArtists"
				:key="artist.id || 'unknown'"
				class="relative h-full w-full overflow-hidden"
			>
				<NuxtImg
					format="webp"
					:alt="artist.name || 'Unknown artist'"
					:src="artist.image || 'https://i.ibb.co/wLhbFZx/Frame-255.png'"
					class="h-full w-full object-cover"
					@load="imageLoaded = true"
					@error="handleImageError"
				/>
				<NuxtLink
					:to="`/artist/${artist.id || 'unknown'}`"
					class="bg-cb-secondary-950/30 absolute inset-0 z-50 flex flex-col items-start justify-end p-5 sm:items-center sm:justify-center"
				>
					<p class="text-3xl font-bold lg:text-5xl xl:text-7xl 2xl:text-9xl">
						{{ artist.name || 'Unknown artist' }}
					</p>
				</NuxtLink>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { Artist } from '~/types'

	defineOptions({
		inheritAttrs: false,
	})

	const props = defineProps<{
		artists: Artist[]
	}>()

	// Filtrer les artistes pour ne garder que ceux avec les propriétés requises
	const validArtists = computed(() => {
		if (!props.artists || !Array.isArray(props.artists)) return []
		return props.artists.filter(
			(artist) => artist && typeof artist === 'object' && artist.id && artist.name,
		)
	})

	const imageLoaded = ref(false)

	// Gérer les erreurs de chargement d'image
	const handleImageError = () => {
		console.warn("Erreur de chargement d'image pour un artiste")
		imageLoaded.value = true
	}
</script>
