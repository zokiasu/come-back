<script setup lang="ts">
	import 'animate.css'

	// L'initialisation de l'auth est gérée par useAuth() dans le plugin auth-init.client.ts
	// Ne pas synchroniser useSupabaseUser() ici pour éviter les race conditions

	const isPlayingVideo = useIsPlayingVideo()
	const route = useRoute()

	const displayingFooter = computed(() => {
		return (
			route &&
			route.name &&
			typeof route.name === 'string' &&
			!route.name.startsWith('dashboard-') &&
			!route.name.startsWith('settings-') &&
			!route.name.startsWith('syncradio')
		)
	})
</script>

<template>
	<div class="bg-cb-secondary-950 text-cb-tertiary-200 flex min-h-screen w-full flex-col">
		<Navigation class="hidden md:block" />
		<div class="inset-x-0 z-50 py-3 md:hidden">
			<img
				src="~/assets/image/logo.png"
				alt="Comeback"
				quality="80"
				loading="lazy"
				class="mx-auto block h-8 w-auto"
			/>
		</div>
		<main class="flex flex-1 flex-col">
			<slot />
		</main>
		<LazyFooter v-if="displayingFooter" />
		<LazyMobileNavigation class="md:hidden" />
		<LazyYoutubePlayer
			v-if="isPlayingVideo"
			ref="YTPlayer"
			class="animate__animated animate__fadeInUp fixed bottom-0"
		/>
	</div>
</template>
