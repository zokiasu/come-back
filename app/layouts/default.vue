<script setup lang="ts">
	import 'animate.css'
	import { useIntersectionObserver } from '@vueuse/core'

	// L'initialisation de l'auth est gérée par useAuth() dans le plugin auth-init.client.ts
	// Ne pas synchroniser useSupabaseUser() ici pour éviter les race conditions

	const isPlayingVideo = useIsPlayingVideo()
	const route = useRoute()
	const mobileNavSentinel = ref<HTMLElement | null>(null)
	const isMobileNavDocked = useState('mobileNavDocked', () => false)

	const displayingFooter = computed(() => {
		return (
			route &&
			route.name &&
			typeof route.name === 'string' &&
			!route.name.startsWith('dashboard-') &&
			!route.name.startsWith('settings-') &&
			!route.name.startsWith('syncradio') &&
			!route.name.startsWith('ranking-music-')
		)
	})

	onMounted(() => {
		useIntersectionObserver(
			mobileNavSentinel,
			([entry]) => {
				isMobileNavDocked.value = Boolean(entry?.isIntersecting)
			},
			{
				rootMargin: '0px 0px 1px 0px',
				threshold: 0.1,
			},
		)
	})
</script>

<template>
	<div class="cb-safe-area bg-cb-secondary-950 text-cb-tertiary-200 flex min-h-screen w-full flex-col">
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
		<LazyFooter v-if="displayingFooter" class="hidden md:block" />
		<div v-if="displayingFooter" class="md:hidden h-24" />
		<div v-if="displayingFooter" ref="mobileNavSentinel" class="md:hidden h-px w-full" />
		<LazyMobileNavigation class="md:hidden" />
		<LazyYoutubePlayer
			v-if="isPlayingVideo"
			ref="YTPlayer"
			class="animate__animated animate__fadeInUp fixed bottom-0"
		/>
	</div>
</template>
